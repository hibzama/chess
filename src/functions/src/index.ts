
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
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as cors from 'cors';

const corsHandler = cors({origin: true});

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

export const joinGame = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    
    const { roomId, fundingWallet } = request.data;
    if (!roomId || !fundingWallet) {
        throw new HttpsError('invalid-argument', 'Room ID and funding wallet are required.');
    }

    const joinerId = request.auth.uid;
    const db = admin.firestore();
    const roomRef = db.collection('game_rooms').doc(roomId);

    try {
        await db.runTransaction(async (transaction) => {
            const roomDoc = await transaction.get(roomRef);

            if (!roomDoc.exists) throw new Error("NOT_FOUND");

            const roomData = roomDoc.data();
            if (!roomData) throw new Error("NOT_FOUND");
            if (roomData.status !== 'waiting') throw new Error("ROOM_NOT_AVAILABLE");
            if (!roomData.createdBy || !roomData.createdBy.uid) throw new Error("INVALID_ROOM_DATA");
            if (roomData.createdBy.uid === joinerId) throw new Error("CANNOT_JOIN_OWN_GAME");
            
            const wager = roomData.wager || 0;
            const creatorId = roomData.createdBy.uid;

            const joinerRef = db.collection('users').doc(joinerId);
            const creatorRef = db.collection('users').doc(creatorId);

            const [joinerDoc, creatorDoc] = await Promise.all([
                transaction.get(joinerRef),
                transaction.get(creatorRef)
            ]);

            if (!joinerDoc.exists()) throw new Error("JOINER_NOT_FOUND");
            if (!creatorDoc.exists()) throw new Error("CREATOR_NOT_FOUND");
            
            const joinerData = joinerDoc.data()!;
            const creatorData = creatorDoc.data()!;
            
            // Verify joiner has funds and deduct wager
            const joinerBalance = joinerData.balance || 0;
            const joinerBonusBalance = joinerData.bonusBalance || 0;
            const joinerSelectedBalance = fundingWallet === 'main' ? joinerBalance : joinerBonusBalance;
            
            if (joinerSelectedBalance < wager) throw new Error("INSUFFICIENT_FUNDS_JOINER");

            const joinerUpdate: { [key: string]: admin.firestore.FieldValue } = {};
            joinerUpdate[fundingWallet === 'main' ? 'balance' : 'bonusBalance'] = admin.firestore.FieldValue.increment(-wager);
            transaction.update(joinerRef, joinerUpdate);
            
            // Record wager for joiner
            const now = admin.firestore.FieldValue.serverTimestamp();
            const joinerTxRef = db.collection('transactions').doc();
            transaction.set(joinerTxRef, {
                userId: joinerId, type: 'wager', amount: wager, status: 'completed',
                description: `Wager for ${roomData.gameType} from ${fundingWallet} wallet`, gameRoomId: roomId, createdAt: now
            });
            
            // Update game room to start
            const creatorColor = roomData.createdBy.color;
            const joinerColor = creatorColor === 'w' ? 'b' : 'w';
            
            const bonusWageredForJoiner = fundingWallet === 'bonus' ? wager : 0;
            const mainWageredForJoiner = fundingWallet === 'main' ? wager : 0;

            transaction.update(roomRef, {
                status: 'in-progress',
                player2: {
                    uid: joinerId,
                    name: `${joinerData.firstName} ${joinerData.lastName}`,
                    color: joinerColor,
                    photoURL: joinerData.photoURL || '',
                    fundingWallet: fundingWallet,
                    wagerFromBonus: bonusWageredForJoiner,
                    wagerFromMain: mainWageredForJoiner,
                },
                players: admin.firestore.FieldValue.arrayUnion(joinerId),
                turnStartTime: admin.firestore.FieldValue.serverTimestamp(),
            });
            
            // Referral Task Progress Update
            const playersForTaskCheck = [
                {id: creatorId, data: creatorData}, 
                {id: joinerId, data: joinerData}
            ];

            for(const player of playersForTaskCheck) {
                const activeTaskId = player.data.activeReferralTaskId;
                if (activeTaskId) {
                    const taskRef = db.collection('referral_tasks').doc(activeTaskId);
                    const taskDoc = await transaction.get(taskRef);
                    if (taskDoc.exists) {
                        const taskData = taskDoc.data();
                        if (taskData) {
                            const gamePlaySubTask = taskData.subTasks.find((st: any) => st.type === 'game_play');
                            if (gamePlaySubTask && gamePlaySubTask.target > 0) {
                                const userToUpdateRef = db.collection('users').doc(player.id);
                                const currentProgress = player.data.taskStatus?.[activeTaskId]?.[gamePlaySubTask.id]?.progress || 0;
                                const newProgress = currentProgress + 1;
                                
                                transaction.set(userToUpdateRef, {
                                    taskStatus: {
                                        [activeTaskId]: {
                                            [gamePlaySubTask.id]: {
                                                progress: newProgress,
                                                status: newProgress >= Number(gamePlaySubTask.target) ? 'completed' : 'pending'
                                            }
                                        }
                                    }
                                }, { merge: true });
                            }
                        }
                    }
                }
            }

        });
        return { success: true };

    } catch (error: any) {
        functions.logger.error('Error joining game:', error);
        
        const errorMap: { [key: string]: HttpsError } = {
            "NOT_FOUND": new HttpsError('not-found', "Room not available."),
            "ROOM_NOT_AVAILABLE": new HttpsError('failed-precondition', "Room is not available for joining."),
            "INVALID_ROOM_DATA": new HttpsError('aborted', "Room data is invalid or missing creator info."),
            "CANNOT_JOIN_OWN_GAME": new HttpsError('failed-precondition', "You cannot join your own game."),
            "JOINER_NOT_FOUND": new HttpsError('not-found', "Your user profile was not found."),
            "CREATOR_NOT_FOUND": new HttpsError('not-found', "The room creator's profile was not found."),
            "INSUFFICIENT_FUNDS_JOINER": new HttpsError('failed-precondition', "You have insufficient funds in the selected wallet."),
        };
        throw errorMap[error.message] || new HttpsError('internal', 'An unexpected error occurred while joining the game.');
    }
});


export const endGame = onCall(async (request) => {
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
                functions.logger.log(`Game ${roomId} already completed.`);
                return;
            }
            if (roomData.status !== 'in-progress') {
                throw new HttpsError('failed-precondition', `Game ${roomId} is not in progress.`);
            }

            const wager = roomData.wager || 0;
            const creatorId = roomData.createdBy.uid;
            const joinerId = roomData.player2?.uid;
            
            if (!joinerId || !roomData.player2) {
                throw new HttpsError('failed-precondition', 'Game is missing a second player.');
            }
            
            const creatorRef = db.collection('users').doc(creatorId);
            const joinerRef = db.collection('users').doc(joinerId);
            
            const creatorDoc = await transaction.get(creatorRef);
            const joinerDoc = await transaction.get(joinerRef);

            if (!creatorDoc.exists() || !joinerDoc.exists()) {
                throw new HttpsError('not-found', 'One or both players could not be found.');
            }

            let creatorPayout = 0;
            let joinerPayout = 0;
            
            const winnerObject: any = { method };

            if (method === 'draw') {
                creatorPayout = joinerPayout = wager * 0.9;
                winnerObject.uid = null;
            } else if (method === 'resign' && resignerDetails && typeof resignerDetails.resignerPieceCount === 'number') {
                let opponentPayoutRate = 1.05;
                if(wager >= 500) opponentPayoutRate = 1.30;
                else if(wager >= 250) opponentPayoutRate = 1.25;
                else if(wager >= 100) opponentPayoutRate = 1.15;
                else opponentPayoutRate = 1.10;

                let resignerRefundRate = 0.75;
                 if(wager >= 100) {
                    if (resignerDetails.resignerPieceCount >= 6) resignerRefundRate = 0.50;
                    else if (resignerDetails.resignerPieceCount >= 3) resignerRefundRate = 0.35;
                    else resignerRefundRate = 0.25;
                 }


                winnerObject.resignerId = resignerDetails.id;
                winnerObject.resignerPieceCount = resignerDetails.resignerPieceCount;

                if (resignerDetails.id === creatorId) { // Creator resigned
                    winnerObject.uid = joinerId;
                    creatorPayout = wager * resignerRefundRate;
                    joinerPayout = wager * opponentPayoutRate;
                } else { // Joiner resigned
                    winnerObject.uid = creatorId;
                    creatorPayout = wager * opponentPayoutRate;
                    joinerPayout = wager * resignerRefundRate;
                }
            } else { // Standard win (checkmate, timeout, piece-capture)
                winnerObject.uid = winnerId;
                if (winnerId === creatorId) {
                    creatorPayout = wager * 1.8;
                } else if (winnerId === joinerId) {
                    joinerPayout = wager * 1.8;
                }
                if (winnerId) {
                    transaction.update(db.collection('users').doc(winnerId), { wins: admin.firestore.FieldValue.increment(1) });
                }
            }

            // Payout Logic
            if (creatorPayout > 0 && roomData.createdBy) {
                 const profit = creatorPayout - (roomData.createdBy.wagerFromMain || 0) - (roomData.createdBy.wagerFromBonus || 0);
                 const mainWalletReturn = (roomData.createdBy.wagerFromMain || 0) + profit;
                 const bonusWalletReturn = (roomData.createdBy.wagerFromBonus || 0);
                 
                 const updatePayload: {[key: string]: admin.firestore.FieldValue} = {};
                 if (mainWalletReturn > 0) updatePayload.balance = admin.firestore.FieldValue.increment(mainWalletReturn);
                 if (bonusWalletReturn > 0) updatePayload.bonusBalance = admin.firestore.FieldValue.increment(bonusWalletReturn);
                 if (Object.keys(updatePayload).length > 0) transaction.update(creatorRef, updatePayload);
                
                transaction.set(db.collection('transactions').doc(), {
                    userId: creatorId, type: 'payout', amount: creatorPayout, status: 'completed',
                    description: `Payout for ${roomData.gameType} game vs ${roomData.player2.name}`, gameRoomId: roomId, createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            if (joinerPayout > 0 && roomData.player2) {
                 const profit = joinerPayout - (roomData.player2.wagerFromMain || 0) - (roomData.player2.wagerFromBonus || 0);
                 const mainWalletReturn = (roomData.player2.wagerFromMain || 0) + profit;
                 const bonusWalletReturn = (roomData.player2.wagerFromBonus || 0);
                 
                 const updatePayload: {[key: string]: admin.firestore.FieldValue} = {};
                 if (mainWalletReturn > 0) updatePayload.balance = admin.firestore.FieldValue.increment(mainWalletReturn);
                 if (bonusWalletReturn > 0) updatePayload.bonusBalance = admin.firestore.FieldValue.increment(bonusWalletReturn);
                 if (Object.keys(updatePayload).length > 0) transaction.update(joinerRef, updatePayload);

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
        functions.logger.error('Error ending game:', error);
        if (error.code) {
             throw error; // Re-throw HttpsError
        }
        throw new HttpsError('internal', 'An unexpected error occurred while ending the game.');
    }
});

export const approveBonusClaim = onCall(async (request) => {
    if (!request.auth || !request.data.claimId) {
        throw new HttpsError('invalid-argument', 'Authentication and claim ID are required.');
    }
    // You could add an admin role check here for more security
    const { claimId, newStatus } = request.data;
    const db = admin.firestore();
    const claimRef = db.collection('bonus_claims').doc(claimId);

    try {
        await db.runTransaction(async (transaction) => {
            const claimDoc = await transaction.get(claimRef);
            if (!claimDoc.exists) throw new HttpsError('not-found', 'Claim document not found.');
            
            const claimData = claimDoc.data();
            if (!claimData || claimData.status !== 'pending') {
                throw new HttpsError('failed-precondition', 'This claim is not in a pending state.');
            }

            if (newStatus === 'approved') {
                if (claimData.claimType === 'referrer_target' && claimData.referrerId && claimData.commissionAmount > 0) {
                    const referrerRef = db.collection('users').doc(claimData.referrerId);
                    transaction.update(referrerRef, { balance: admin.firestore.FieldValue.increment(claimData.commissionAmount) });
                }
                
                if (claimData.claimType === 'new_user_task' && claimData.newUserId && claimData.bonusAmount > 0) {
                    const newUserRef = db.collection('users').doc(claimData.newUserId);
                    transaction.update(newUserRef, { bonusBalance: admin.firestore.FieldValue.increment(claimData.bonusAmount) });
                }
            }
            transaction.update(claimRef, { status: newStatus });
        });
        return { success: true };
    } catch(error: any) {
        functions.logger.error('Error approving bonus claim:', error);
        if (error.code) throw error;
        throw new HttpsError('internal', 'An error occurred while processing the claim.');
    }
});
