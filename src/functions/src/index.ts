

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
    .document('game_rooms/{gameRoomId}')
    .onUpdate(async (change, context) => {
        const gameRoomId = context.params.gameRoomId;
        const beforeData = change.before.data();
        const afterData = change.after.data();

        // 1. Only run when a game is completed and not on a draw
        if (beforeData.status !== 'completed' && afterData.status === 'completed' && !afterData.draw) {
            const gameWager = afterData.wager || 0;
            if (gameWager <= 0) {
                functions.logger.log(`Game ${gameRoomId}: Skipping commissions for zero wager game.`);
                return null;
            }

            const playerIds = afterData.players || [];
            if (playerIds.length < 2) {
                functions.logger.log(`Not enough players in game room ${gameRoomId} to process commissions.`);
                return null;
            }

            const db = admin.firestore();
            const batch = db.batch();

            // 2. Iterate through EACH player in the game to check for their referrers
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

                // 3. Process Regular User Commission (Level 1)
                if (referredBy) {
                    const referrerDoc = await db.collection('users').doc(referredBy).get();
                    if (referrerDoc.exists && referrerDoc.data()?.role === 'user') {
                        const l1Count = referrerDoc.data()?.l1Count || 0;
                        const l1Rate = l1Count >= 20 ? 0.05 : 0.03;
                        const commissionAmount = gameWager * l1Rate;

                        if (commissionAmount > 0) {
                            functions.logger.log(`Paying L1 commission of ${commissionAmount} to ${referredBy} from player ${playerId}'s game.`);
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
                            batch.update(db.collection('users').doc(referredBy), {
                                balance: admin.firestore.FieldValue.increment(commissionAmount),
                            });
                        }
                    }
                }

                // 4. Process Marketing Partner Commissions (Up to 20 Levels)
                if (referralChain.length > 0) {
                    const marketerCommissionRate = 0.03;
                    const commissionAmount = gameWager * marketerCommissionRate;

                    if (commissionAmount > 0) {
                        const relevantChain = referralChain.slice(-20);

                        for (let i = 0; i < relevantChain.length; i++) {
                            const marketerId = relevantChain[i];
                            const level = referralChain.indexOf(marketerId) + 1;

                            functions.logger.log(`Paying L${level} marketing commission of ${commissionAmount} to ${marketerId} from player ${playerId}'s game.`);

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
        }

        return null;
    });

// This function triggers whenever a payout transaction is created for a game winner.
export const updateEventProgress = functions.firestore
  .document('transactions/{transactionId}')
  .onCreate(async (snap, context) => {
    const transaction = snap.data();
    const db = admin.firestore();

    // 1. Ensure this is a valid winning payout transaction.
    // The winner is the user who received the payout.
    if (transaction.type !== 'payout' || !transaction.userId) {
      return null;
    }

    const winnerId = transaction.userId;
    const wagerAmount = transaction.gameWager || 0;
    const gameId = transaction.gameRoomId;

    if (!gameId) {
      return null; // Exit if there's no game ID.
    }

    // 2. Ensure the winner did not resign.
    if (transaction.resignerId && winnerId === transaction.resignerId) {
        functions.logger.log(`Exiting event progress: Winner ${winnerId} was the resigner.`);
        return null;
    }

    // 3. Correctly calculate net earning.
    const netEarning = transaction.amount - wagerAmount;

    // 4. Fetch game details to find opponent name.
    const gameDoc = await db.collection('game_rooms').doc(gameId).get();
    if (!gameDoc.exists) return null;
    const gameData = gameDoc.data();
    if (!gameData) return null;

    const opponentId = gameData.players.find((p: string) => p !== winnerId);
    let opponentName = 'Unknown Player';
    if (opponentId) {
        const opponentDoc = await db.collection('users').doc(opponentId).get();
        if(opponentDoc.exists()) {
            const opponentData = opponentDoc.data();
            opponentName = `${opponentData?.firstName} ${opponentData?.lastName}`;
        }
    }


    // Get all active events.
    const eventsRef = db.collection('events');
    const activeEventsSnapshot = await eventsRef.where('isActive', '==', true).get();

    if (activeEventsSnapshot.empty) {
      return null;
    }

    const batch = db.batch();
    let hasUpdates = false;

    // 5. Iterate through each active event.
    for (const eventDoc of activeEventsSnapshot.docs) {
      const event = eventDoc.data();
      const enrollmentRef = db.collection('users').doc(winnerId).collection('event_enrollments').doc(event.id);
      
      const enrollmentSnap = await enrollmentRef.get();
      
      // 6. Check if user is enrolled in this event and the event is not expired/completed.
      if (enrollmentSnap.exists) {
          const enrollment = enrollmentSnap.data();
          if (enrollment && enrollment.status === 'enrolled' && enrollment.expiresAt.toDate() > new Date()) {
              let progressIncrement = 0;
              
              // 7. Update progress based on event type.
              if (event.targetType === 'winningMatches') {
                  if (!event.minWager || wagerAmount >= event.minWager) {
                      progressIncrement = 1;
                  }
              } else if (event.targetType === 'totalEarnings') {
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

                  // Log progress in a subcollection for history
                  const historyRef = enrollmentRef.collection('progress_history').doc();
                  batch.set(historyRef, {
                    gameId: gameId,
                    opponentName: opponentName,
                    increment: progressIncrement,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                  });


                  // If the new progress meets or exceeds the target, mark as completed and give reward.
                  if (newProgress >= event.targetAmount) {
                      updatePayload.status = 'completed';
                      if (event.rewardAmount > 0) {
                        batch.update(db.collection('users').doc(winnerId), {
                            bonusBalance: admin.firestore.FieldValue.increment(event.rewardAmount)
                        });
                      }
                  }
                  batch.update(enrollmentRef, updatePayload);
              }
          }
      }
    }

    // 8. Commit the batch if there are any updates.
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

    