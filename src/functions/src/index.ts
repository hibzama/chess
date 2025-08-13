
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import axios from "axios";
import { logger } from "firebase-functions";

admin.initializeApp();

export const announceNewGame = onDocumentCreated("game_rooms/{roomId}", async (event) => {
    const snap = event.data;
    if (!snap) {
        logger.log("No data associated with the event");
        return;
    }
    const roomData = snap.data();
    const roomId = event.params.roomId;

    if (!roomData || roomData.isPrivate === true) {
      logger.log(`Function exiting: Room ${roomId} is private or has no data.`);
      return;
    }

    let telegramBotToken;
    try {
      const functionsConfig = admin.app().options.config;
      if (functionsConfig && functionsConfig.telegram) {
          telegramBotToken = functionsConfig.telegram.token;
      }
    } catch (error) {
      logger.error("Could not retrieve telegram.token from Functions config.");
    }
    
    if (!telegramBotToken) {
        logger.error(
            "Telegram token not found. " +
            "Ensure it is set by running: " +
            "firebase functions:config:set telegram.token=\"YOUR_BOT_TOKEN\""
        );
        return;
    }


    const chatId = "@nexbattlerooms";
    const siteUrl = "http://nexbattle.com";

    const gameType = roomData.gameType ? `${roomData.gameType.charAt(0).toUpperCase()}${roomData.gameType.slice(1)}` : "Game";
    const wager = roomData.wager || 0;
    const createdBy = roomData.createdBy?.name || "A Player";
    const timeControlValue = roomData.timeControl;
    const timeControl = timeControlValue ? `${timeControlValue / 60} min` : "Not set";
    const gameLink = `${siteUrl}/game/multiplayer/${roomId}`;

    logger.log(`Preparing message for Room ID: ${roomId}`);
    logger.log(`Game Type: ${gameType}, Wager: ${wager}, Created By: ${createdBy}, Time: ${timeControl}`);

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
      logger.log(`Successfully sent message for Room ID: ${roomId}`);
    } catch (error: any) {
      logger.error("Error sending message to Telegram:", error.response?.data || error.message);
    }
});


export const endGame = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { roomId, winnerId, method, resignerDetails } = request.data;
    if (!roomId || !method) {
        throw new HttpsError('invalid-argument', 'Room ID and method are required.');
    }

    const db = admin.firestore();
    const roomRef = db.collection('game_rooms').doc(roomId);

    try {
        await db.runTransaction(async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists) {
                throw new HttpsError('not-found', 'Game room not found.');
            }

            const roomData = roomDoc.data();
            if (!roomData) {
                 throw new HttpsError('not-found', 'Game room data is missing.');
            }
            if (roomData.status === 'completed') {
                logger.log(`Game ${roomId} already completed.`);
                return;
            }
            if (roomData.status !== 'in-progress') {
                throw new HttpsError('failed-precondition', `Game ${roomId} is not in progress.`);
            }

            const wager = roomData.wager || 0;
            const creatorId = roomData.createdBy.uid;
            const joinerId = roomData.player2?.uid;
            if (!joinerId) {
                throw new HttpsError('failed-precondition', 'Game is missing a second player.');
            }
            
            const creatorRef = db.collection('users').doc(creatorId);
            const joinerRef = db.collection('users').doc(joinerId);

            let creatorPayout = 0;
            let joinerPayout = 0;
            
            const winnerObject: any = { method };

            if (method === 'draw') {
                creatorPayout = joinerPayout = wager * 0.9;
                winnerObject.uid = null;
            } else if (method === 'resign' && resignerDetails) {
                winnerObject.uid = resignerDetails.id === creatorId ? joinerId : creatorId;
                winnerObject.resignerId = resignerDetails.id;
                winnerObject.resignerPieceCount = resignerDetails.pieceCount;
                
                let resignerRefundRate = 0;
                if (resignerDetails.pieceCount >= 6) resignerRefundRate = 0.50;
                else if (resignerDetails.pieceCount >= 3) resignerRefundRate = 0.35;
                else resignerRefundRate = 0.25;

                const opponentPayoutRate = 1.30;
                
                if (resignerDetails.id === creatorId) {
                    creatorPayout = wager * resignerRefundRate;
                    joinerPayout = wager * opponentPayoutRate;
                } else {
                    creatorPayout = wager * opponentPayoutRate;
                    joinerPayout = wager * resignerRefundRate;
                }
            } else { // Standard win (checkmate, timeout, piece-capture)
                winnerObject.uid = winnerId;
                if (winnerId === creatorId) {
                    creatorPayout = wager * 1.8;
                } else {
                    joinerPayout = wager * 1.8;
                }
                transaction.update(db.collection('users').doc(winnerId), { wins: admin.firestore.FieldValue.increment(1) });
            }

            // Payout Logic
            if (creatorPayout > 0) {
                transaction.update(creatorRef, { balance: admin.firestore.FieldValue.increment(creatorPayout) });
                transaction.set(db.collection('transactions').doc(), {
                    userId: creatorId, type: 'payout', amount: creatorPayout, status: 'completed',
                    description: `Payout for ${roomData.gameType} game vs ${roomData.player2.name}`, gameRoomId: roomId, createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            if (joinerPayout > 0) {
                transaction.update(joinerRef, { balance: admin.firestore.FieldValue.increment(joinerPayout) });
                transaction.set(db.collection('transactions').doc(), {
                    userId: joinerId, type: 'payout', amount: joinerPayout, status: 'completed',
                    description: `Payout for ${roomData.gameType} game vs ${roomData.createdBy.name}`, gameRoomId: roomId, createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // Finalize room
            transaction.update(roomRef, { status: 'completed', winner: winnerObject, draw: method === 'draw' });
        });
        return { success: true };
    } catch (error: any) {
        logger.error('Error ending game:', error);
        if (error.code) {
             throw error; // Re-throw HttpsError
        }
        throw new HttpsError('internal', 'An unexpected