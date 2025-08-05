

/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/onCall";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

admin.initializeApp();

// This function triggers whenever a new document is created in 'game_rooms'
export const announceNewGame = functions.firestore
  .document("game_rooms/{roomId}")
  .onCreate(async (snap, context) => {
    const roomData = snap.data();
    const roomId = context.params.roomId; // Correct way to get wildcard ID

    // Exit if the function is triggered with no data, or for a private room
    if (!roomData || roomData.isPrivate === true) {
      functions.logger.log(`Function exiting: Room ${roomId} is private or has no data.`);
      return null;
    }

    let telegramBotToken;
    try {
      telegramBotToken = functions.config().telegram.token;
    } catch (error) {
      functions.logger.error(
        "Could not retrieve telegram.token from Functions config. " +
        "Ensure it is set by running: " +
        "firebase functions:config:set telegram.token=\"YOUR_BOT_TOKEN\""
      );
      return null;
    }

    const chatId = "@nexbattlerooms"; // Your Telegram group username
    const siteUrl = "http://nexbattle.com";

    // Prepare message components with fallbacks
    const gameType = roomData.gameType ? `${roomData.gameType.charAt(0).toUpperCase()}${roomData.gameType.slice(1)}` : "Game";
    const wager = roomData.wager || 0;
    const createdBy = roomData.createdBy?.name || "A Player";
    const timeControlValue = roomData.timeControl;
    const timeControl = timeControlValue ? `${timeControlValue / 60} min` : "Not set";
    const gameLink = `${siteUrl}/game/multiplayer/${roomId}`;

    // Log the variables to ensure they are being read correctly
    functions.logger.log(`Preparing message for Room ID: ${roomId}`);
    functions.logger.log(`Game Type: ${gameType}, Wager: ${wager}, Created By: ${createdBy}, Time: ${timeControl}`);

    // Construct the message string carefully
    const message = `⚔️ <b>New Public ${gameType} Room!</b> ⚔️\n\n` +
      `<b>Player:</b> ${createdBy}\n` +
      `<b>Wager:</b> LKR ${wager.toFixed(2)}\n` +
      `<b>Time:</b> ${timeControl}\n\n` +
      `<i>Room ID:</i> <code>${roomId}</code>\n\n` +
      `<a href="${gameLink}">Click Here to Join Game</a>\n\n` +
      `<i>This room will expire in 3 minutes if no one joins.</i>`;

    const telegramApiUrl =
      `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;

    try {
      await axios.post(telegramApiUrl, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      });
      functions.logger.log(`Successfully sent message for Room ID: ${roomId}`);
    } catch (error: any) {
      functions.logger.error("Error sending message to Telegram:", error.response?.data || error.message);
    }

    return null;
  });

// This function triggers whenever a payout transaction is created.
export const updateEventProgress = functions.firestore
  .document('transactions/{transactionId}')
  .onCreate(async (snap, context) => {
    const transaction = snap.data();

    // Exit if not a payout transaction
    if (transaction.type !== 'payout') {
      return null;
    }

    // A payout is for a winner. The winnerId is the key.
    const winnerId = transaction.winnerId; 
    
    // If there's no winnerId, it's not a win, so no event progress.
    if (!winnerId) {
        functions.logger.log(`Exiting event progress for tx ${context.params.transactionId}: No winnerId found.`);
        return null;
    }
    
    const wagerAmount = transaction.gameWager || 0; 
    // Calculate net earning based on the actual payout vs the wager.
    const netEarning = transaction.amount - wagerAmount;

    // Get all active events
    const eventsRef = admin.firestore().collection('events');
    const activeEventsSnapshot = await eventsRef.where('isActive', '==', true).get();

    if (activeEventsSnapshot.empty) {
      return null;
    }

    const batch = admin.firestore().batch();
    let hasUpdates = false;

    // Iterate through each active event
    for (const eventDoc of activeEventsSnapshot.docs) {
      const event = eventDoc.data();
      const enrollmentRef = admin.firestore().collection('users').doc(winnerId).collection('event_enrollments').doc(event.id);
      
      const enrollmentSnap = await enrollmentRef.get();
      
      // Check if user is enrolled and event is not expired/completed
      if (enrollmentSnap.exists) {
          const enrollment = enrollmentSnap.data();
          if (enrollment && enrollment.status === 'enrolled' && enrollment.expiresAt.toDate() > new Date()) {
              let progressIncrement = 0;
              
              if (event.targetType === 'winningMatches') {
                  // A win is a win, as long as they are the winnerId
                  if (!event.minWager || wagerAmount >= event.minWager) {
                      progressIncrement = 1;
                  }
              } else if (event.targetType === 'totalEarnings') {
                  // Only count positive net earnings towards progress.
                  if (netEarning > 0) { 
                      progressIncrement = netEarning;
                  }
              }

              if (progressIncrement > 0) {
                  hasUpdates = true;
                  const newProgress = (enrollment.progress || 0) + progressIncrement;
                  const updatePayload: { [key: string]: any } = { 
                      progress: admin.firestore.FieldValue.increment(progressIncrement) 
                  };

                  // If the new progress meets or exceeds the target, mark as completed.
                  if (newProgress >= event.targetAmount) {
                      updatePayload.status = 'completed';
                  }
                  batch.update(enrollmentRef, updatePayload);
              }
          }
      }
    }

    // Commit the batch if there are any updates
    if (hasUpdates) {
      try {
        await batch.commit();
        functions.logger.log(`Successfully updated event progress for user ${winnerId}.`);
      } catch (error) {
        functions.logger.error(`Error committing event progress for user ${winnerId}:`, error);
      }
    }

    return null;
  });
