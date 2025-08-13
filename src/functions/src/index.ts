
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
    const siteUrl = "https://nexbattle.com";

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


export const joinGame = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    
    const { roomId } = request.data;
    const userId = request.auth.uid;

    if (!roomId) {
        throw new HttpsError('invalid-argument', 'Room ID is required.');
    }
    
    const db = admin.firestore();
    const roomRef = db.collection('game_rooms').doc(roomId);
    const joinerRef = db.collection('users').doc(userId);

    try {
        const joinerDoc = await joinerRef.get();
        if (!joinerDoc.exists()) {
            throw new HttpsError('not-found', 'Your user profile could not be found.');
        }
        const joinerData = joinerDoc.data()!;

        await db.runTransaction(async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists()) {
                throw new HttpsError('not-found', 'Game room not found.');
            }
            const roomData = roomDoc.data()!;

            if (roomData.status !== 'waiting') {
                throw new HttpsError('failed-precondition', 'This room is no longer available.');
            }
            if (roomData.createdBy.uid === userId) {
                throw new HttpsError('failed-precondition', 'You cannot join your own game.');
            }
            if (roomData.players.includes(userId)) {
                throw new HttpsError('failed-precondition', 'You are already in this room.');
            }

            const creatorColor = roomData.createdBy.color;
            const joinerColor = creatorColor === 'w' ? 'b' : 'w';

            transaction.update(roomRef, {
                status: 'in-progress',
                player2: { uid: userId, name: `${joinerData.firstName} ${joinerData.lastName}`, color: joinerColor, photoURL: joinerData.photoURL || '' },
                players: admin.firestore.FieldValue.arrayUnion(userId),
                turnStartTime: admin.firestore.FieldValue.serverTimestamp(),
            });
        });

        return { success: true, message: 'Game joined successfully' };
    } catch (error: any) {
        logger.error('Error joining game transaction:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'An unexpected error occurred while joining the room.', error.message);
    }
});
