
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


export const createGameRoom = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const userId = request.auth.uid;
    const { gameType, wager, timeControl, isPrivate, pieceColor } = request.data;
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);

    try {
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            throw new HttpsError('not-found', 'User data not found.');
        }
        const userData = userDoc.data()!;

        const totalBalance = (userData.balance || 0) + (userData.bonusBalance || 0);
        if (totalBalance < wager) {
            throw new HttpsError('failed-precondition', 'Insufficient funds.');
        }

        const roomRef = db.collection('game_rooms').doc();
        const batch = db.batch();

        const bonusWagered = Math.min(wager, userData.bonusBalance || 0);
        const mainWagered = wager - bonusWagered;
        const updatePayload: { [key: string]: any } = {};
        if (bonusWagered > 0) updatePayload.bonusBalance = admin.firestore.FieldValue.increment(-bonusWagered);
        if (mainWagered > 0) updatePayload.balance = admin.firestore.FieldValue.increment(-mainWagered);
        batch.update(userRef, updatePayload);
        
        let finalPieceColor = pieceColor;
        if (pieceColor === 'random') {
            finalPieceColor = Math.random() > 0.5 ? 'w' : 'b';
        }

        batch.set(roomRef, {
            gameType,
            wager,
            timeControl,
            isPrivate,
            status: 'waiting',
            createdBy: {
                uid: userId,
                name: `${userData.firstName} ${userData.lastName}`,
                color: finalPieceColor,
                photoURL: userData.photoURL || ''
            },
            players: [userId],
            p1Time: timeControl,
            p2Time: timeControl,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 3 * 60 * 1000)
        });

        if (wager > 0) {
            const transactionRef = db.collection('transactions').doc();
            batch.set(transactionRef, {
                userId,
                type: 'wager',
                amount: wager,
                status: 'completed',
                description: `Wager for ${gameType} game`,
                gameRoomId: roomRef.id,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        
        await batch.commit();
        return { success: true, roomId: roomRef.id, message: 'Room created successfully!' };
    } catch (error: any) {
        logger.error('Error in createGameRoom:', error);
        throw new HttpsError('internal', error.message || 'An unexpected error occurred.');
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

export const enrollInEvent = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const userId = request.auth.uid;
    const { eventId, enrollmentFee } = request.data;
    
    if (!eventId || typeof enrollmentFee !== 'number') {
        throw new HttpsError('invalid-argument', 'The function must be called with a valid "eventId" and "enrollmentFee".');
    }
    
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);
    const eventRef = db.collection('events').doc(eventId);
    const enrollmentRef = userRef.collection('event_enrollments').doc(eventId);

    try {
        const userDoc = await userRef.get();
        const eventDoc = await eventRef.get();
    
        if (!userDoc.exists()) {
            throw new HttpsError('not-found', 'Your user data could not be found.');
        }
        if (!eventDoc.exists()) {
            throw new HttpsError('not-found', 'The event does not exist.');
        }
        
        const userData = userDoc.data()!;
        const eventData = eventDoc.data()!;

        await db.runTransaction(async (transaction) => {
            const freshEnrollmentDoc = await transaction.get(enrollmentRef);
            if (freshEnrollmentDoc.exists) {
                throw new HttpsError('already-exists', 'You are already enrolled in this event.');
            }
        
            if (!eventData.isActive) {
                throw new HttpsError('failed-precondition', 'This event is not currently active.');
            }
            if (eventData.maxEnrollees > 0 && (eventData.enrolledCount || 0) >= eventData.maxEnrollees) {
                throw new HttpsError('resource-exhausted', 'This event is full.');
            }
        
            const totalBalance = (userData.balance || 0) + (userData.bonusBalance || 0);
            if (totalBalance < enrollmentFee) {
                throw new HttpsError('failed-precondition', 'Insufficient funds to enroll.');
            }
        
            const bonusDeduction = Math.min((userData.bonusBalance || 0), enrollmentFee);
            const mainDeduction = enrollmentFee - bonusDeduction;

            const userUpdate: {[key: string]: any} = {};
            if (mainDeduction > 0) userUpdate.balance = admin.firestore.FieldValue.increment(-mainDeduction);
            if (bonusDeduction > 0) userUpdate.bonusBalance = admin.firestore.FieldValue.increment(-bonusDeduction);
            
            transaction.update(userRef, userUpdate);

            const now = new Date();
            const durationHours = Number(eventData.durationHours);
            const expiryDate = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

            transaction.set(enrollmentRef, {
                eventId: eventId,
                userId: userId,
                status: 'enrolled',
                progress: 0,
                enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
                expiresAt: admin.firestore.Timestamp.fromDate(expiryDate)
            });

            transaction.update(eventRef, {enrolledCount: admin.firestore.FieldValue.increment(1)});
        });
        
        return {success: true, message: 'Enrolled successfully!'};
    } catch (error: any) {
        logger.error('Error in enrollInEvent:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', error.message || 'An unexpected error occurred.');
    }
});
