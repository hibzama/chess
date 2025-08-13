
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

admin.initializeApp();

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
