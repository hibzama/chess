

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

        // 1. Ensure this is a valid winning payout transaction, not from a resignation
        if (transaction.type !== 'payout' || !transaction.winnerId || transaction.resignerId) {
            return null;
        }

        const gameWager = transaction.gameWager || 0;
        if (gameWager <= 0) {
            functions.logger.log(`Skipping commissions for zero wager game. Txn ID: ${context.params.transactionId}`);
            return null;
        }

        const gameRoomId = transaction.gameRoomId;
        const gameRoomSnap = await admin.firestore().collection('game_rooms').doc(gameRoomId).get();
        if (!gameRoomSnap.exists) {
            functions.logger.error(`Game room ${gameRoomId} not found.`);
            return null;
        }
        const gameRoomData = gameRoomSnap.data();
        const playerIds = gameRoomData?.players || [];
        
        const db = admin.firestore();
        const batch = db.batch();

        for (const playerId of playerIds) {
            const userDoc = await db.collection('users').doc(playerId).get();
            if (!userDoc.exists) continue;

            const userData = userDoc.data();
            if (!userData) continue;

            const referredBy = userData.referredBy;
            const referralChain = userData.referralChain || [];
            
            // 2. Process Regular User Commission (Level 1)
            if (referredBy) {
                const referrerDoc = await db.collection('users').doc(referredBy).get();
                if (referrerDoc.exists && referrerDoc.data()?.role === 'user') {
                    const l1Rate = (referrerDoc.data()?.l1Count || 0) > 20 ? 0.05 : 0.03; // 5% for rank 2, 3% for rank 1
                    const commissionAmount = gameWager * l1Rate;

                    if (commissionAmount > 0) {
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
            
            // 3. Process Marketing Partner Commissions (Up to 20 Levels)
            if (referralChain.length > 0) {
                const commissionAmount = gameWager * 0.03; // 3% commission for marketers
                if (commissionAmount > 0) {
                    // Pay commission to the last 20 members of the chain
                    const relevantChain = referralChain.slice(-20);
                    
                    for (let i = 0; i < relevantChain.length; i++) {
                        const marketerId = relevantChain[i];
                        const level = i + 1;

                        const commissionTxRef = db.collection('transactions').doc();
                        batch.set(commissionTxRef, {
                            userId: marketerId,
                            fromUserId: playerId,
                            type: 'commission',
                            amount: commissionAmount,
                            level: level,
                            gameRoomId: gameRoomId,
                            status: 'completed',
                            description: `Level ${level} commission from ${userData.firstName}`,
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
            functions.logger.log(`Successfully processed commissions for game ${gameRoomId}.`);
        } catch (error) {
            functions.logger.error(`Error committing commission batch for game ${gameRoomId}:`, error);
        }

        return null;
    });

