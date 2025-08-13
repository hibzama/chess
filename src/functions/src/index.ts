
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentCreated, onUpdate } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import axios from "axios";
import { logger } from "firebase-functions";
import { firestore } from "firebase-admin";

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
      // Use a more robust way to access config
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

export const processCommissions = onUpdate('game_rooms/{gameRoomId}', async (event) => {
    const db = admin.firestore();
    const gameRoomId = event.params.gameRoomId;
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) return;

    if (beforeData.status !== 'completed' && afterData.status === 'completed' && !afterData.draw) {
        const gameWager = afterData.wager || 0;
        if (gameWager <= 0) {
            logger.log(`Game ${gameRoomId}: Skipping commissions for zero wager game.`);
            return;
        }

        const playerIds = afterData.players || [];
        if (playerIds.length < 2) {
            logger.log(`Not enough players in game room ${gameRoomId} to process commissions.`);
            return;
        }

        const batch = db.batch();

        for (const playerId of playerIds) {
            const userDoc = await db.collection('users').doc(playerId).get();
            if (!userDoc.exists) {
                logger.warn(`Player ${playerId} not found, skipping their commission chain.`);
                continue;
            }

            const userData = userDoc.data();
            if (!userData) continue;

            const referredBy = userData.referredBy;
            const referralChain = userData.referralChain || [];

            if (referredBy) {
                const referrerDoc = await db.collection('users').doc(referredBy).get();
                if (referrerDoc.exists && referrerDoc.data()?.role === 'user') {
                    const l1Count = referrerDoc.data()?.l1Count || 0;
                    const l1Rate = l1Count >= 20 ? 0.05 : 0.03;
                    const commissionAmount = gameWager * l1Rate;

                    if (commissionAmount > 0) {
                        logger.log(`Paying L1 commission of ${commissionAmount} to ${referredBy} from player ${playerId}'s game.`);
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
                            createdAt: firestore.FieldValue.serverTimestamp(),
                        });
                        batch.update(db.collection('users').doc(referredBy), {
                            balance: firestore.FieldValue.increment(commissionAmount),
                        });
                    }
                }
            }

            if (referralChain.length > 0) {
                const marketerCommissionRate = 0.03;
                const commissionAmount = gameWager * marketerCommissionRate;

                if (commissionAmount > 0) {
                    const relevantChain = referralChain.slice(-20);

                    for (let i = 0; i < relevantChain.length; i++) {
                        const marketerId = relevantChain[i];
                        const level = referralChain.indexOf(marketerId) + 1;

                        logger.log(`Paying L${level} marketing commission of ${commissionAmount} to ${marketerId} from player ${playerId}'s game.`);

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
                            createdAt: firestore.FieldValue.serverTimestamp(),
                        });
                        batch.update(db.collection('users').doc(marketerId), {
                            marketingBalance: firestore.FieldValue.increment(commissionAmount),
                        });
                    }
                }
            }
        }

        try {
            await batch.commit();
            logger.log(`Successfully committed commission batch for game ${gameRoomId}.`);
        } catch (error) {
            logger.error(`Error committing commission batch for game ${gameRoomId}:`, error);
        }
    }
});


export const createGameRoom = onCall({ cors: true }, async (request) => {
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
        if (bonusWagered > 0) updatePayload.bonusBalance = firestore.FieldValue.increment(-bonusWagered);
        if (mainWagered > 0) updatePayload.balance = firestore.FieldValue.increment(-mainWagered);
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
            createdAt: firestore.FieldValue.serverTimestamp(),
            expiresAt: firestore.Timestamp.fromMillis(Date.now() + 3 * 60 * 1000)
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
                createdAt: firestore.FieldValue.serverTimestamp()
            });
        }
        
        await batch.commit();
        return { success: true, roomId: roomRef.id, message: 'Room created successfully!' };
    } catch (error: any) {
        logger.error('Error in createGameRoom:', error);
        throw new HttpsError('internal', error.message || 'An unexpected error occurred.');
    }
});


export const joinGame = onCall({ cors: true }, async (request) => {
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
                players: firestore.FieldValue.arrayUnion(userId),
                turnStartTime: firestore.FieldValue.serverTimestamp(),
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
