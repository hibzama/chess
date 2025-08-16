
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";
import { HttpsError, onCall } from "firebase-functions/v2/https";

admin.initializeApp();
const cors = require('cors')({origin: true});

// This function triggers whenever a new user document is created
export const onUserCreate = functions.firestore
  .document("users/{userId}")
  .onCreate(async (snap, context) => {
    const newUser = snap.data();
    
    // Increment the referrer's count if 'bonusReferredBy' exists
    if (newUser.bonusReferredBy) {
        const referrerId = newUser.bonusReferredBy;
        const referrerRef = admin.firestore().collection('users').doc(referrerId);
        
        try {
            await referrerRef.update({
                bonusReferralCount: admin.firestore.FieldValue.increment(1)
            });
            functions.logger.log(`Incremented bonusReferralCount for user ${referrerId}`);
        } catch (error) {
            functions.logger.error(`Failed to increment bonusReferralCount for user ${referrerId}:`, error);
        }
    }

    return null;
  });

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
      functions.logger.error("Could not retrieve telegram.token from Functions config.");
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

export const joinGame = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    
    const { roomId, fundingWallet } = request.data;
    if (!roomId) throw new HttpsError('invalid-argument', 'Room ID is required.');
    if (!fundingWallet) throw new HttpsError('invalid-argument', 'Funding wallet is required.');

    const joinerId = request.auth.uid;
    const db = admin.firestore();
    const roomRef = db.collection('game_rooms').doc(roomId);

    try {
        await db.runTransaction(async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists) throw new HttpsError('not-found', "Room not available.");
            
            const roomData = roomDoc.data();
            if (!roomData) throw new HttpsError('not-found', "Room data is missing.");
            if (roomData.status !== 'waiting') throw new HttpsError('failed-precondition', "Room is not available for joining.");
            if (roomData.createdBy.uid === joinerId) throw new HttpsError('failed-precondition', "You cannot join your own game.");
            
            const wager = roomData.wager || 0;
            const creatorId = roomData.createdBy.uid;

            const creatorRef = db.collection('users').doc(creatorId);
            const joinerRef = db.collection('users').doc(joinerId);

            const [creatorDoc, joinerDoc] = await Promise.all([
                transaction.get(creatorRef),
                transaction.get(joinerRef)
            ]);
            
            if (!creatorDoc.exists() || !joinerDoc.exists()) throw new HttpsError('aborted', "One of the players could not be found.");
            
            const creatorData = creatorDoc.data()!;
            const joinerData = joinerDoc.data()!;

            const joinerWalletField = fundingWallet === 'bonus' ? 'bonusBalance' : 'balance';

            if ((joinerData[joinerWalletField] || 0) < wager) throw new HttpsError('failed-precondition', "You have insufficient funds.");
            
            // Deduct from joiner's wallet
            transaction.update(joinerRef, { [joinerWalletField]: admin.firestore.FieldValue.increment(-wager) });
            // Deduct from creator's wallet
            const creatorBonusWagered = roomData.createdBy.wagerFromBonus || 0;
            const creatorMainWagered = roomData.createdBy.wagerFromMain || 0;
            if(creatorBonusWagered > 0) transaction.update(creatorRef, { bonusBalance: admin.firestore.FieldValue.increment(-creatorBonusWagered) });
            if(creatorMainWagered > 0) transaction.update(creatorRef, { balance: admin.firestore.FieldValue.increment(-creatorMainWagered) });
            
            const creatorColor = roomData.createdBy.color;
            const joinerColor = creatorColor === 'w' ? 'b' : 'w';
            
            transaction.update(roomRef, {
                status: 'in-progress',
                player2: { 
                    uid: joinerId, 
                    name: `${joinerData.firstName} ${joinerData.lastName}`, 
                    color: joinerColor, 
                    photoURL: joinerData.photoURL || '',
                    fundingWallet: fundingWallet,
                },
                players: admin.firestore.FieldValue.arrayUnion(joinerId),
                turnStartTime: admin.firestore.FieldValue.serverTimestamp(),
            });
        });

        return { success: true };

    } catch (error: any) {
        functions.logger.error('Error joining game:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'An unexpected error occurred while joining the game.');
    }
});

export const endGame = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { roomId, winnerId, method, resignerDetails } = request.data;
    if (!roomId || !method) {
        throw new HttpsError('invalid-argument', 'Room ID and end method are required.');
    }

    const db = admin.firestore();
    const roomRef = db.collection('game_rooms').doc(roomId);

    try {
        await db.runTransaction(async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists) throw new HttpsError('not-found', 'Game room not found.');

            const roomData = roomDoc.data();
            if (!roomData || roomData.status === 'completed') return;

            const wager = roomData.wager || 0;
            const creatorId = roomData.createdBy.uid;
            const joinerId = roomData.player2?.uid;
            
            if (!joinerId) throw new HttpsError('failed-precondition', 'Game is missing a second player.');

            let creatorPayout = 0, joinerPayout = 0;
            const winnerObject: any = { method };

            if (method === 'draw') {
                creatorPayout = joinerPayout = wager * 0.9;
                winnerObject.uid = null;
            } else if (method === 'resign' && resignerDetails) {
                let opponentPayoutRate = 1.05;
                let resignerRefundRate = 0.75;
                
                winnerObject.resignerId = resignerDetails.id;
                
                if (resignerDetails.id === creatorId) {
                    winnerObject.uid = joinerId;
                    creatorPayout = wager * resignerRefundRate;
                    joinerPayout = wager * opponentPayoutRate;
                } else {
                    winnerObject.uid = creatorId;
                    creatorPayout = wager * opponentPayoutRate;
                    joinerPayout = wager * resignerRefundRate;
                }
            } else {
                winnerObject.uid = winnerId;
                if (winnerId === creatorId) creatorPayout = wager * 1.8;
                else if (winnerId === joinerId) joinerPayout = wager * 1.8;
                if (winnerId) transaction.update(db.collection('users').doc(winnerId), { wins: admin.firestore.FieldValue.increment(1) });
            }
            
            if (creatorPayout > 0) transaction.update(db.collection('users').doc(creatorId), { balance: admin.firestore.FieldValue.increment(creatorPayout) });
            if (joinerPayout > 0) transaction.update(db.collection('users').doc(joinerId), { balance: admin.firestore.FieldValue.increment(joinerPayout) });
            
            transaction.update(roomRef, { status: 'completed', winner: winnerObject, draw: method === 'draw' });
        });
        return { success: true };
    } catch (error: any) {
        functions.logger.error('Error ending game:', error);
        throw new HttpsError('internal', 'An unexpected error occurred.');
    }
});
