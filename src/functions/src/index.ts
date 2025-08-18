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
    const roomId = context.params.roomId;

    if (!roomData || roomData.isPrivate === true) {
      functions.logger.log(`Function exiting: Room ${roomId} is private or has no data.`);
      return null;
    }

    let telegramBotToken;
    try {
      telegramBotToken = functions.config().telegram.token;
    } catch (error) {
      functions.logger.error("Could not retrieve telegram.token from Functions config. Make sure it's set by running 'firebase functions:config:set telegram.token=YOUR_TOKEN'");
      return null;
    }
    
    if(!telegramBotToken) {
        functions.logger.error("Telegram bot token is not configured.");
        return null;
    }

    const chatId = "@nexbattlerooms";
    const siteUrl = "http://nexbattle.com";
    const gameType = roomData.gameType ? `${roomData.gameType.charAt(0).toUpperCase()}${roomData.gameType.slice(1)}` : "Game";
    const wager = roomData.wager || 0;
    const createdBy = roomData.createdBy?.name || "A Player";
    const timeControlValue = roomData.timeControl;
    const timeControl = timeControlValue ? `${timeControlValue / 60} min` : "Not set";
    const gameLink = `${siteUrl}/game/multiplayer/${roomId}`;

    const message = `⚔️ <b>New Public ${gameType} Room!</b> ⚔️\n\n` +
      `<b>Player:</b> ${createdBy}\n` +
      `<b>Wager:</b> LKR ${wager.toFixed(2)}\n` +
      `<b>Time:</b> ${timeControl}\n\n` +
      `<i>Room ID:</i> <code>${roomId}</code>\n\n` +
      `<a href="${gameLink}">Click Here to Join Game</a>\n\n` +
      `<i>This room will expire in 3 minutes if no one joins.</i>`;

    const telegramApiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;

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

// This function triggers whenever a bonus claim is created
export const onBonusClaim = functions.firestore
  .document("bonus_claims/{claimId}")
  .onCreate(async (snap, context) => {
    const claimData = snap.data();
    if (!claimData) {
      functions.logger.error("No data in claim document");
      return null;
    }

    const { campaignId, type } = claimData;

    if (!campaignId) {
      functions.logger.error(`Claim ${context.params.claimId} has no campaignId.`);
      return null;
    }
    
    let campaignCollectionName: string;
    
    // Determine the collection based on the claim type
    switch(type) {
        case 'signup':
            campaignCollectionName = 'signup_bonus_campaigns';
            break;
        case 'task':
            campaignCollectionName = 'tasks';
            break;
        case 'referrer':
        case 'referee':
             campaignCollectionName = 'referral_campaigns';
            break;
        default:
            functions.logger.error(`Unknown claim type: ${type}`);
            return null;
    }

    const campaignRef = admin.firestore().doc(`${campaignCollectionName}/${campaignId}`);

    try {
        await campaignRef.update({
            claimsCount: admin.firestore.FieldValue.increment(1)
        });
        functions.logger.log(`Incremented claimsCount for campaign ${campaignId} in ${campaignCollectionName}`);
    } catch (error) {
        functions.logger.error(`Failed to increment claimsCount for campaign ${campaignId} in ${campaignCollectionName}`, error);
    }
    
    return null;
  });


export const approveBonusClaim = functions.https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Must be an administrative user to approve claims.');
    }

    const { claimId } = data;
    const db = admin.firestore();

    if (!claimId) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a "claimId".');
    }

    const claimRef = db.doc(`bonus_claims/${claimId}`);

    try {
        await db.runTransaction(async (transaction) => {
            const claimDoc = await transaction.get(claimRef);
            if (!claimDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Claim document not found.');
            }
            const claimData = claimDoc.data()!;

            if (claimData.status === 'approved') {
                 throw new functions.https.HttpsError('failed-precondition', 'This claim has already been approved.');
            }

            const userRef = db.doc(`users/${claimData.userId}`);
            transaction.update(userRef, { balance: admin.firestore.FieldValue.increment(claimData.amount) });
            
            const transactionRef = db.collection('transactions').doc();
            transaction.set(transactionRef, {
                userId: claimData.userId,
                type: 'bonus',
                amount: claimData.amount,
                status: 'completed',
                description: `${claimData.campaignTitle}`,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            transaction.update(claimRef, { status: 'approved' });
        });
        
        return { success: true };
    } catch (error: any) {
        functions.logger.error("Error approving claim:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred while approving the claim.');
    }
});

export const joinGame = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to join a game.');
    }

    const { roomId } = data;
    const joinerId = context.auth.uid;
    const db = admin.firestore();

    if (!roomId) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a "roomId".');
    }

    const roomRef = db.doc(`game_rooms/${roomId}`);

    try {
        await db.runTransaction(async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists || roomDoc.data()?.status !== 'waiting') {
                throw new functions.https.HttpsError('not-found', 'Room not available.');
            }

            const roomData = roomDoc.data()!;
            const creatorId = roomData.createdBy.uid;

            if (creatorId === joinerId) {
                throw new functions.https.HttpsError('failed-precondition', 'You cannot join your own game.');
            }
            
            const joinerRef = db.doc(`users/${joinerId}`);
            const joinerDoc = await transaction.get(joinerRef);

            if (!joinerDoc.exists()) {
                throw new functions.https.HttpsError('not-found', 'Your user data could not be found.');
            }
            const joinerData = joinerDoc.data()!;

            if (joinerData.balance < roomData.wager) {
                 throw new functions.https.HttpsError('failed-precondition', 'Insufficient funds.');
            }
            
            const creatorColor = roomData.createdBy.color;
            const joinerColor = creatorColor === 'w' ? 'b' : 'w';

            transaction.update(roomRef, {
                status: 'in-progress',
                player2: { uid: joinerId, name: `${joinerData.firstName} ${joinerData.lastName}`, color: joinerColor, photoURL: joinerData.photoURL || '' },
                players: admin.firestore.FieldValue.arrayUnion(joinerId),
                turnStartTime: admin.firestore.FieldValue.serverTimestamp(),
            });
            
            // Handle wagers and commissions for both players
            const playersToProcess = [
                { id: creatorId, name: roomData.createdBy.name },
                { id: joinerId, name: `${joinerData.firstName} ${joinerData.lastName}` }
            ];

            for (const player of playersToProcess) {
                const userRef = db.doc(`users/${player.id}`);
                transaction.update(userRef, { balance: admin.firestore.FieldValue.increment(-roomData.wager) });

                const wagerTransactionRef = db.collection('transactions').doc();
                transaction.set(wagerTransactionRef, {
                    userId: player.id, type: 'wager', amount: roomData.wager, status: 'completed',
                    description: `Wager for ${roomData.gameType} game vs ${player.id === creatorId ? playersToProcess[1].name : playersToProcess[0].name}`,
                    gameRoomId: roomId, createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

        });
         return { success: true };
    } catch (error: any) {
        functions.logger.error("Error joining game:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred while joining the game.');
    }
});

