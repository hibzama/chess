
import * as functions from "firebase-functions";
import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import axios from "axios";

admin.initializeApp();
const db = admin.firestore();

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
      functions.logger.error(
        "Could not retrieve telegram.token from Functions config. " +
        "Ensure it is set by running: " +
        "firebase functions:config:set telegram.token=\"YOUR_BOT_TOKEN\""
      );
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

    functions.logger.log(`Preparing message for Room ID: ${roomId}`);
    functions.logger.log(`Game Type: ${gameType}, Wager: ${wager}, Created By: ${createdBy}, Time: ${timeControl}`);

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

            const batch = db.batch();

            for (const playerId of playerIds) {
                const userDoc = await db.collection('users').doc(playerId).get();
                if (!userDoc.exists()) {
                    functions.logger.warn(`Player ${playerId} not found, skipping their commission chain.`);
                    continue;
                }

                const userData = userDoc.data();
                if (!userData) continue;

                const referredBy = userData.referredBy;
                const referralChain = userData.referralChain || [];

                if (referredBy) {
                    const referrerDoc = await db.collection('users').doc(referredBy).get();
                    if (referrerDoc.exists() && referrerDoc.data()?.role === 'user') {
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


export const updateEventProgressOnGameEnd = functions.firestore
  .document('game_rooms/{gameId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const gameData = change.after.data();
    const gameId = context.params.gameId;

    if (beforeData.status === 'completed' || gameData.status !== 'completed') {
      return null;
    }

    const batch = db.batch();
    const wagerAmount = gameData.wager || 0;
    const playerIds = gameData.players || [];
    const winnerId = gameData.winner?.uid || null;

    if (playerIds.length < 2) return null;

    for (const playerId of playerIds) {
        const isWinner = playerId === winnerId;
        const netEarning = isWinner ? (wagerAmount * 0.8) : -wagerAmount;

        const opponentId = playerIds.find((p: string) => p !== playerId);
        let opponentName = 'Unknown';
        if (opponentId) {
            const opponentDoc = await db.collection('users').doc(opponentId).get();
            if (opponentDoc.exists()) {
                const opponentData = opponentDoc.data();
                if(opponentData) opponentName = `${opponentData.firstName} ${opponentData.lastName}`;
            }
        }
        
        const enrollmentsRef = db.collection('users').doc(playerId).collection('event_enrollments');
        const activeEnrollmentsSnapshot = await enrollmentsRef.where('status', '==', 'enrolled').get();

        if (activeEnrollmentsSnapshot.empty) {
            continue;
        }

        for (const enrollmentDoc of activeEnrollmentsSnapshot.docs) {
            const enrollment = enrollmentDoc.data();
            const eventDoc = await db.collection('events').doc(enrollment.eventId).get();
            if (!eventDoc.exists()) continue;

            const event = eventDoc.data();
            if (!event || !event.isActive || enrollment.expiresAt.toDate() < new Date()) continue;
            
            let progressIncrement = 0;
            let shouldLogHistory = false;

            if (event.targetType === 'winningMatches') {
                shouldLogHistory = true;
                if (isWinner && gameData.winner?.resignerId !== opponentId && (!event.minWager || wagerAmount >= event.minWager)) {
                    progressIncrement = 1;
                }
            } else if (event.targetType === 'totalEarnings') {
                 shouldLogHistory = true;
                if (netEarning > 0) {
                    progressIncrement = netEarning;
                }
            }

            if(shouldLogHistory) {
                 const historyRef = enrollmentDoc.ref.collection('progress_history').doc();
                 batch.set(historyRef, {
                    gameId: gameId,
                    opponentName: opponentName,
                    increment: progressIncrement,
                    result: isWinner ? 'win' : 'loss',
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                 });

                 if (progressIncrement > 0) {
                    const newProgress = (enrollment.progress || 0) + progressIncrement;
                    const updatePayload: { [key: string]: any } = { 
                        progress: admin.firestore.FieldValue.increment(progressIncrement) 
                    };

                    if (newProgress >= event.targetAmount) {
                        updatePayload.status = 'completed';
                        if (event.rewardAmount > 0) {
                            batch.update(db.collection('users').doc(playerId), {
                                bonusBalance: admin.firestore.FieldValue.increment(event.rewardAmount)
                            });
                        }
                    }
                    batch.update(enrollmentDoc.ref, updatePayload);
                 }
            }
        }
    }

    try {
        await batch.commit();
        functions.logger.log(`Successfully updated event progress for game ${gameId}.`);
    } catch (error) {
        functions.logger.error(`Error committing event progress for game ${gameId}:`, error);
    }
    
    return null;
});


export const enrollInEvent = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const userId = request.auth.uid;
    const { eventId } = request.data;

    if (!eventId) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with an "eventId".');
    }

    const userRef = db.collection('users').doc(userId);
    const eventRef = db.collection('events').doc(eventId);
    const enrollmentRef = userRef.collection('event_enrollments').doc(eventId);

    try {
        return await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            const eventDoc = await transaction.get(eventRef);
            const enrollmentDoc = await transaction.get(enrollmentRef);

            if (!userDoc.exists()) {
                throw new functions.https.HttpsError('not-found', 'Your user data could not be found.');
            }
            if (!eventDoc.exists()) {
                throw new functions.https.HttpsError('not-found', 'The event does not exist.');
            }
            if (enrollmentDoc.exists()) {
                throw new functions.https.HttpsError('already-exists', 'You are already enrolled in this event.');
            }
            
            const userData = userDoc.data()!;
            const eventData = eventDoc.data()!;

            if (!eventData.isActive) {
                throw new functions.https.HttpsError('failed-precondition', 'This event is not currently active.');
            }
            if (eventData.maxEnrollees && eventData.maxEnrollees > 0 && (eventData.enrolledCount || 0) >= eventData.maxEnrollees) {
                throw new functions.https.HttpsError('resource-exhausted', 'This event is full.');
            }
            
            const enrollmentFee = Number(eventData.enrollmentFee || 0);
            const totalBalance = (userData.balance || 0) + (userData.bonusBalance || 0);

            if (totalBalance < enrollmentFee) {
                throw new functions.https.HttpsError('failed-precondition', 'Insufficient funds to enroll.');
            }

            const bonusDeduction = Math.min((userData.bonusBalance || 0), enrollmentFee);
            const mainDeduction = enrollmentFee - bonusDeduction;

            const userUpdate: { [key: string]: any } = {};
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

            transaction.update(eventRef, { enrolledCount: admin.firestore.FieldValue.increment(1) });
            
            return { success: true, message: 'Enrolled successfully!' };
        });

    } catch (error: any) {
        functions.logger.error('Error in enrollInEvent transaction:', error);
        if (error instanceof functions.https.HttpsError) {
             throw error;
        }
        throw new functions.https.HttpsError('internal', error.message || 'An unexpected error occurred.');
    }
});

export const joinGame = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    
    const { roomId } = request.data;
    const userId = request.auth.uid;

    if (!roomId) {
        throw new functions.https.HttpsError('invalid-argument', 'Room ID is required.');
    }

    const roomRef = db.collection('game_rooms').doc(roomId);
    const joinerRef = db.collection('users').doc(userId);

    try {
        const joinerDoc = await joinerRef.get();
        if (!joinerDoc.exists()) {
            throw new functions.https.HttpsError('not-found', 'Your user profile could not be found.');
        }
        const joinerData = joinerDoc.data();
        if (!joinerData) {
            throw new functions.https.HttpsError('data-loss', 'Your user profile data is corrupt.');
        }

        await db.runTransaction(async (transaction) => {
            const roomDoc = await transaction.get(roomRef);

            if (!roomDoc.exists()) {
                throw new functions.https.HttpsError('not-found', 'Game room not found.');
            }
            
            const roomData = roomDoc.data();
            if (!roomData) {
                throw new functions.https.HttpsError('data-loss', 'Game room data is corrupt.');
            }

            if (roomData.status !== 'waiting') {
                throw new functions.https.HttpsError('failed-precondition', 'This room is no longer available.');
            }
            if (roomData.createdBy.uid === userId) {
                throw new functions.https.HttpsError('failed-precondition', 'You cannot join your own game.');
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
        functions.logger.error('Error joining game:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred.', error.message);
    }
});
