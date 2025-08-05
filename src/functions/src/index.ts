
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


export const processCommissions = functions.firestore
    .document('transactions/{transactionId}')
    .onCreate(async (snap, context) => {
        const transaction = snap.data();
        const txnId = context.params.transactionId;

        // 1. Commission logic should only run for winning payouts, not draws.
        if (transaction.type !== 'payout' || !transaction.winnerId) {
            functions.logger.log(`Txn ${txnId}: Not a commissionable payout. Type: ${transaction.type}, Winner: ${!!transaction.winnerId}`);
            return null;
        }

        const gameWager = transaction.gameWager || 0;
        if (gameWager <= 0) {
            functions.logger.log(`Txn ${txnId}: Skipping commissions for zero wager game.`);
            return null;
        }

        const gameRoomId = transaction.gameRoomId;
        if (!gameRoomId) {
            functions.logger.error(`Txn ${txnId} is missing gameRoomId.`);
            return null;
        }
        
        const gameRoomSnap = await admin.firestore().collection('game_rooms').doc(gameRoomId).get();
        if (!gameRoomSnap.exists) {
            functions.logger.error(`Game room ${gameRoomId} not found for transaction ${txnId}.`);
            return null;
        }
        
        const gameRoomData = gameRoomSnap.data();
        const playerIds = gameRoomData?.players || [];
        if (playerIds.length === 0) {
            functions.logger.log(`No players found in game room ${gameRoomId}.`);
            return null;
        }
        
        const db = admin.firestore();
        const batch = db.batch();

        // Iterate through each player in the game to check for their referrers
        for (const playerId of playerIds) {
            const userDoc = await db.collection('users').doc(playerId).get();
            if (!userDoc.exists) {
                functions.logger.warn(`Player ${playerId} not found, skipping their commission chain.`);
                continue;
            }

            const userData = userDoc.data();
            if (!userData) continue;

            const referredBy = userData.referredBy;
            const referralChain = userData.referralChain || [];
            
            // Process Regular User Commission (Level 1)
            if (referredBy) {
                const referrerDoc = await db.collection('users').doc(referredBy).get();
                // Ensure referrer is a 'user' to avoid double-dipping if a marketer is also a direct referrer
                if (referrerDoc.exists && referrerDoc.data()?.role === 'user') {
                    const l1Count = referrerDoc.data()?.l1Count || 0;
                    const l1Rate = l1Count >= 21 ? 0.05 : 0.03; // 5% for Rank 2 (21+), 3% for Rank 1
                    const commissionAmount = gameWager * l1Rate;

                    if (commissionAmount > 0) {
                        functions.logger.log(`Paying L1 commission of ${commissionAmount} to ${referredBy} from player ${playerId}`);
                        const commissionTxRef = db.collection('transactions').doc();
                        batch.set(commissionTxRef, {
                            userId: referredBy,
                            fromUserId: playerId,
                            type: 'commission',
                            amount: commissionAmount,
                            level: 1,
                            gameRoomId: gameRoomId,
                            status: 'completed',
                            description: `L1 commission from ${userData.firstName}`,
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        });
                        // Regular user commissions go to their main balance
                        batch.update(db.collection('users').doc(referredBy), {
                            balance: admin.firestore.FieldValue.increment(commissionAmount),
                        });
                    }
                }
            }
            
            // Process Marketing Partner Commissions (Up to 20 Levels)
            if (referralChain.length > 0) {
                const marketerCommissionRate = 0.03; 
                const commissionAmount = gameWager * marketerCommissionRate;

                if (commissionAmount > 0) {
                    // Pay commission to the last 20 members of the chain
                    const relevantChain = referralChain.slice(-20);
                    
                    for (let i = 0; i < relevantChain.length; i++) {
                        const marketerId = relevantChain[i];
                        const level = i + 1; // Level is their position in the chain for this specific user
                        functions.logger.log(`Paying L${level} marketing commission of ${commissionAmount} to ${marketerId} from player ${playerId}`);

                        const commissionTxRef = db.collection('transactions').doc();
                        batch.set(commissionTxRef, {
                            userId: marketerId,
                            fromUserId: playerId,
                            type: 'commission',
                            amount: commissionAmount,
                            level: level,
                            gameRoomId: gameRoomId,
                            status: 'completed',
                            description: `Level ${level} marketing commission from ${userData.firstName}`,
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        });
                        // Marketing commissions go to their dedicated marketingBalance
                        batch.update(db.collection('users').doc(marketerId), {
                            marketingBalance: admin.firestore.FieldValue.increment(commissionAmount),
                        });
                    }
                }
            }
        }
        
        try {
            await batch.commit();
            functions.logger.log(`Successfully committed commission batch for game ${gameRoomId}.`);
        } catch (error) {
            functions.logger.error(`Error committing commission batch for game ${gameRoomId}:`, error);
        }

        return null;
    });


// This function triggers whenever a payout transaction is created for a game winner.
export const updateEventProgress = functions.firestore
  .document('transactions/{transactionId}')
  .onCreate(async (snap, context) => {
    const transaction = snap.data();

    // 1. Ensure this is a valid winning payout transaction.
    if (transaction.type !== 'payout' || !transaction.winnerId) {
      return null;
    }

    // 2. Ensure the winner did not resign.
    if (transaction.resignerId && transaction.winnerId === transaction.resignerId) {
        functions.logger.log(`Exiting event progress: Winner ${transaction.winnerId} was the resigner.`);
        return null;
    }

    const winnerId = transaction.winnerId;
    const wagerAmount = transaction.gameWager || 0;
    // 3. Correctly calculate net earning.
    const netEarning = transaction.amount - wagerAmount;

    // Get all active events.
    const eventsRef = admin.firestore().collection('events');
    const activeEventsSnapshot = await eventsRef.where('isActive', '==', true).get();

    if (activeEventsSnapshot.empty) {
      return null;
    }

    const batch = admin.firestore().batch();
    let hasUpdates = false;

    // Iterate through each active event.
    for (const eventDoc of activeEventsSnapshot.docs) {
      const event = eventDoc.data();
      const enrollmentRef = admin.firestore().collection('users').doc(winnerId).collection('event_enrollments').doc(event.id);
      
      const enrollmentSnap = await enrollmentRef.get();
      
      // Check if user is enrolled in this event and the event is not expired/completed.
      if (enrollmentSnap.exists) {
          const enrollment = enrollmentSnap.data();
          if (enrollment && enrollment.status === 'enrolled' && enrollment.expiresAt.toDate() > new Date()) {
              let progressIncrement = 0;
              
              // 4. Update progress based on event type.
              if (event.targetType === 'winningMatches') {
                  // A win is a win, as long as they are the winnerId and not the resigner
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

    // 5. Commit the batch if there are any updates.
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
