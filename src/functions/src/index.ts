
'use server';
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
        await db.runTransaction(async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            const joinerDoc = await transaction.get(joinerRef);

            if (!roomDoc.exists()) {
                throw new HttpsError('not-found', 'Game room not found.');
            }
            if (!joinerDoc.exists()) {
                throw new HttpsError('not-found', 'Your user profile could not be found.');
            }

            const roomData = roomDoc.data()!;
            const joinerData = joinerDoc.data()!;
            const wagerAmount = roomData.wager || 0;

            if (roomData.status !== 'waiting') {
                throw new HttpsError('failed-precondition', 'This room is no longer available.');
            }
            if (roomData.createdBy.uid === userId) {
                throw new HttpsError('failed-precondition', 'You cannot join your own game.');
            }
            if (roomData.players.includes(userId)) {
                throw new HttpsError('failed-precondition', 'You are already in this room.');
            }

            const totalBalance = (joinerData.balance || 0) + (joinerData.bonusBalance || 0);
            if (totalBalance < wagerAmount) {
                throw new HttpsError('failed-precondition', 'Insufficient funds to join this game.');
            }

            // Deduct wager from joiner's balance
            const bonusDeduction = Math.min(joinerData.bonusBalance || 0, wagerAmount);
            const mainDeduction = wagerAmount - bonusDeduction;

            const userUpdate: { [key: string]: any } = {};
            if (bonusDeduction > 0) userUpdate.bonusBalance = admin.firestore.FieldValue.increment(-bonusDeduction);
            if (mainDeduction > 0) userUpdate.balance = admin.firestore.FieldValue.increment(-mainDeduction);
            transaction.update(joinerRef, userUpdate);

            // Log the wager transaction for the joiner
            if (wagerAmount > 0) {
                const transactionRef = db.collection('transactions').doc();
                transaction.set(transactionRef, {
                    userId: userId,
                    type: 'wager',
                    amount: wagerAmount,
                    status: 'completed',
                    description: `Wager for ${roomData.gameType} game`,
                    gameRoomId: roomRef.id,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            // Update the game room
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

export const createGameRoom = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const userId = request.auth.uid;
    const { gameType, wager, timeControl, isPrivate, pieceColor } = request.data;
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);

    try {
        const roomRef = await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw new HttpsError('not-found', 'User data not found.');
            }
            const userData = userDoc.data()!;

            const totalBalance = (userData.balance || 0) + (userData.bonusBalance || 0);
            if (totalBalance < wager) {
                throw new HttpsError('failed-precondition', 'Insufficient funds.');
            }

            // Deduct wager
            const bonusWagered = Math.min(wager, userData.bonusBalance || 0);
            const mainWagered = wager - bonusWagered;
            const updatePayload: { [key: string]: any } = {};
            if (bonusWagered > 0) updatePayload.bonusBalance = admin.firestore.FieldValue.increment(-bonusWagered);
            if (mainWagered > 0) updatePayload.balance = admin.firestore.FieldValue.increment(-mainWagered);
            transaction.update(userRef, updatePayload);
            
            // Create game room
            let finalPieceColor = pieceColor;
            if (pieceColor === 'random') {
                finalPieceColor = Math.random() > 0.5 ? 'w' : 'b';
            }

            const newRoomRef = db.collection('game_rooms').doc();
            transaction.set(newRoomRef, {
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

            // Log wager transaction
            if (wager > 0) {
                const transactionRef = db.collection('transactions').doc();
                transaction.set(transactionRef, {
                    userId,
                    type: 'wager',
                    amount: wager,
                    status: 'completed',
                    description: `Wager for ${gameType} game`,
                    gameRoomId: newRoomRef.id,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            return newRoomRef;
        });
        
        return { success: true, message: 'Room created successfully!', roomId: roomRef.id };
    } catch (error: any) {
        logger.error('Error in createGameRoom:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', error.message || 'An unexpected error occurred.');
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
        const result = await db.runTransaction(async (transaction) => {
            const roomDoc = await transaction.get(roomRef);

            if (!roomDoc.exists()) {
                throw new HttpsError('not-found', 'Game room not found.');
            }
            const roomData = roomDoc.data()!;
            
            if (roomData.status === 'completed') {
                logger.log('Game already completed, skipping payout.');
                return { success: true, message: 'Game already completed.'};
            }
            if (roomData.status !== 'in-progress') {
                throw new HttpsError('failed-precondition', 'Game is not in progress.');
            }

            const wager = roomData.wager || 0;
            const creatorId = roomData.createdBy.uid;
            const joinerId = roomData.player2?.uid;

            if (!joinerId) {
                throw new HttpsError('failed-precondition', 'Game is missing a second player.');
            }

            let creatorPayout = 0;
            let joinerPayout = 0;
            const winnerObject: any = { method };

            if (method === 'draw') {
                creatorPayout = joinerPayout = wager * 0.9;
                winnerObject.uid = null;
            } else if (method === 'resign' && resignerDetails) {
                winnerObject.uid = resignerDetails.id === creatorId ? joinerId : creatorId;
                winnerObject.resignerId = resignerDetails.id;
                const winnerReturn = wager * 1.05;
                const resignerReturn = wager * 0.75;
                
                if (resignerDetails.id === creatorId) {
                    creatorPayout = resignerReturn;
                    joinerPayout = winnerReturn;
                } else {
                    creatorPayout = winnerReturn;
                    joinerPayout = resignerReturn;
                }
            } else { // Standard win
                winnerObject.uid = winnerId;
                if (winnerId === creatorId) {
                    creatorPayout = wager * 1.8;
                } else {
                    joinerPayout = wager * 1.8;
                }
                transaction.update(db.collection('users').doc(winnerId), { wins: admin.firestore.FieldValue.increment(1) });
            }

            // Update balances and log transactions
            const creatorRef = db.collection('users').doc(creatorId);
            const joinerRef = db.collection('users').doc(joinerId);

            if (creatorPayout > 0) {
                transaction.update(creatorRef, { balance: admin.firestore.FieldValue.increment(creatorPayout) });
                transaction.set(db.collection('transactions').doc(), {
                    userId: creatorId, type: 'payout', amount: creatorPayout, status: 'completed',
                    description: `Payout for ${roomData.gameType} game`, gameRoomId: roomId, createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            if (joinerPayout > 0) {
                transaction.update(joinerRef, { balance: admin.firestore.FieldValue.increment(joinerPayout) });
                transaction.set(db.collection('transactions').doc(), {
                    userId: joinerId, type: 'payout', amount: joinerPayout, status: 'completed',
                    description: `Payout for ${roomData.gameType} game`, gameRoomId: roomId, createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // Finalize room document
            transaction.update(roomRef, {
                status: 'completed',
                winner: winnerObject,
                draw: method === 'draw',
            });
            
            return { success: true, message: 'Game ended successfully.' };
        });

        return result;

    } catch (error: any) {
        logger.error('Error ending game:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'An unexpected error occurred while ending the game.', error.message);
    }
});
