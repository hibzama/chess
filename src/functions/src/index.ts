
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
import { HttpsError } from "firebase-functions/v1/https";

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

export const joinGame = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    
    const { roomId } = data;
    if (!roomId) {
        throw new functions.https.HttpsError('invalid-argument', 'Room ID is required.');
    }

    const joinerId = context.auth.uid;
    const db = admin.firestore();
    const roomRef = db.collection('game_rooms').doc(roomId);

    try {
        await db.runTransaction(async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists) {
                throw new functions.https.HttpsError('not-found', "Room not available");
            }
            const roomData = roomDoc.data();
            if (!roomData || roomData.status !== 'waiting') {
                throw new functions.https.HttpsError('failed-precondition', "Room is not available for joining.");
            }
            if (!roomData.createdBy || !roomData.createdBy.uid) {
                throw new functions.https.HttpsError('aborted', "Room data is invalid or missing creator info.");
            }
            if (roomData.createdBy.uid === joinerId) {
                throw new functions.https.HttpsError('failed-precondition', "You cannot join your own game.");
            }
            
            const wager = roomData.wager || 0;
            const creatorId = roomData.createdBy.uid;

            const joinerRef = db.collection('users').doc(joinerId);
            const creatorRef = db.collection('users').doc(creatorId);

            const [joinerDoc, creatorDoc] = await Promise.all([
                transaction.get(joinerRef),
                transaction.get(creatorRef)
            ]);

            if (!joinerDoc.exists()) throw new functions.https.HttpsError('not-found', "Your user profile was not found.");
            if (!creatorDoc.exists()) throw new functions.https.HttpsError('not-found', "The creator's profile was not found.");
            
            const joinerData = joinerDoc.data()!;
            const creatorData = creatorDoc.data()!;
            
            const joinerTotalBalance = (joinerData.balance || 0) + (joinerData.bonusBalance || 0);
            if (joinerTotalBalance < wager) {
                throw new functions.https.HttpsError('failed-precondition', "You have insufficient funds.");
            }
            const creatorTotalBalance = (creatorData.balance || 0) + (creatorData.bonusBalance || 0);
            if (creatorTotalBalance < wager) {
                 throw new functions.https.HttpsError('failed-precondition', "The creator has insufficient funds.");
            }
            
            // Wager deduction logic
            const joinerBonusWagered = Math.min(wager, joinerData.bonusBalance || 0);
            const joinerMainWagered = wager - joinerBonusWagered;
            transaction.update(joinerRef, {
                balance: admin.firestore.FieldValue.increment(-joinerMainWagered),
                bonusBalance: admin.firestore.FieldValue.increment(-joinerBonusWagered)
            });

            const creatorBonusWagered = Math.min(wager, creatorData.bonusBalance || 0);
            const creatorMainWagered = wager - creatorBonusWagered;
            transaction.update(creatorRef, {
                balance: admin.firestore.FieldValue.increment(-creatorMainWagered),
                bonusBalance: admin.firestore.FieldValue.increment(-creatorBonusWagered)
            });

            // Update room
            const creatorColor = roomData.createdBy.color;
            const joinerColor = creatorColor === 'w' ? 'b' : 'w';
            transaction.update(roomRef, {
                status: 'in-progress',
                'createdBy.wagerFromBonus': creatorBonusWagered,
                'createdBy.wagerFromMain': creatorMainWagered,
                player2: {
                    uid: joinerId,
                    name: `${joinerData.firstName} ${joinerData.lastName}`,
                    color: joinerColor,
                    photoURL: joinerData.photoURL || '',
                    wagerFromBonus: joinerBonusWagered,
                    wagerFromMain: joinerMainWagered,
                },
                players: admin.firestore.FieldValue.arrayUnion(joinerId),
                turnStartTime: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Create transaction logs
            const now = admin.firestore.FieldValue.serverTimestamp();
            const joinerTxRef = db.collection('transactions').doc();
            transaction.set(joinerTxRef, {
                userId: joinerId, type: 'wager', amount: wager, status: 'completed',
                description: `Wager for ${roomData.gameType} game vs ${creatorData.firstName}`, gameRoomId: roomId, createdAt: now
            });
            const creatorTxRef = db.collection('transactions').doc();
            transaction.set(creatorTxRef, {
                userId: creatorId, type: 'wager', amount: wager, status: 'completed',
                description: `Wager for ${roomData.gameType} game vs ${joinerData.firstName}`, gameRoomId: roomId, createdAt: now
            });
        });

        return { success: true };

    } catch (error: any) {
        functions.logger.error('Error joining game:', {
            errorMessage: error.message,
            errorCode: error.code,
            errorDetails: error.details,
            roomId: roomId,
            joinerId: joinerId
        });

        if (error instanceof HttpsError) {
             throw error; 
        }
        
        // This is a generic error that will be caught by the client
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred. Please try again.');
    }
});


export const endGame = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { roomId, winnerId, method, resignerDetails } = data;
    if (!roomId || !method) {
        throw new functions.https.HttpsError('invalid-argument', 'Room ID and method are required.');
    }

    const db = admin.firestore();
    const roomRef = db.collection('game_rooms').doc(roomId);

    try {
        await db.runTransaction(async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Game room not found.');
            }

            const roomData = roomDoc.data();
            if (!roomData) {
                 throw new functions.https.HttpsError('not-found', 'Game room data is missing.');
            }
            if (roomData.status === 'completed') {
                functions.logger.log(`Game ${roomId} already completed.`);
                return;
            }
            if (roomData.status !== 'in-progress') {
                throw new functions.https.HttpsError('failed-precondition', `Game ${roomId} is not in progress.`);
            }

            const wager = roomData.wager || 0;
            const creatorId = roomData.createdBy.uid;
            const joinerId = roomData.player2?.uid;
            if (!joinerId) {
                throw new functions.https.HttpsError('failed-precondition', 'Game is missing a second player.');
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
                const opponentPayoutRate = 1.30;
                let resignerRefundRate = 0;
                if (resignerDetails.pieceCount >= 6) resignerRefundRate = 0.50;
                else if (resignerDetails.pieceCount >= 3) resignerRefundRate = 0.35;
                else resignerRefundRate = 0.25;

                winnerObject.resignerId = resignerDetails.id;
                winnerObject.resignerPieceCount = resignerDetails.pieceCount;

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
                 const profit = creatorPayout - wager;
                 // Return wager to original wallets, profit to main balance
                 transaction.update(creatorRef, { 
                     balance: admin.firestore.FieldValue.increment((roomData.createdBy.wagerFromMain || 0) + profit),
                     bonusBalance: admin.firestore.FieldValue.increment(roomData.createdBy.wagerFromBonus || 0)
                 });
                transaction.set(db.collection('transactions').doc(), {
                    userId: creatorId, type: 'payout', amount: creatorPayout, status: 'completed',
                    description: `Payout for ${roomData.gameType} game vs ${roomData.player2.name}`, gameRoomId: roomId, createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            if (joinerPayout > 0 && roomData.player2) {
                 const profit = joinerPayout - wager;
                  // Return wager to original wallets, profit to main balance
                 transaction.update(joinerRef, { 
                     balance: admin.firestore.FieldValue.increment((roomData.player2.wagerFromMain || 0) + profit),
                     bonusBalance: admin.firestore.FieldValue.increment(roomData.player2.wagerFromBonus || 0)
                 });
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
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred while ending the game.');
    }
});

export const approveBonusClaim = functions.https.onCall(async (data, context) => {
    if (!context.auth || !data.claimId) {
        throw new functions.https.HttpsError('invalid-argument', 'Authentication and claim ID are required.');
    }
    // You could add an admin role check here for more security
    const { claimId, newStatus } = data;
    const db = admin.firestore();
    const claimRef = db.collection('bonus_claims').doc(claimId);

    try {
        await db.runTransaction(async (transaction) => {
            const claimDoc = await transaction.get(claimRef);
            if (!claimDoc.exists) throw new functions.https.HttpsError('not-found', 'Claim document not found.');
            
            const claimData = claimDoc.data();
            if (!claimData || claimData.status !== 'pending') {
                throw new functions.https.HttpsError('failed-precondition', 'This claim is not in a pending state.');
            }

            if (newStatus === 'approved') {
                // Handle referrer target bonus
                if (claimData.claimType === 'referrer_target' && claimData.referrerId && claimData.commissionAmount > 0) {
                    const referrerRef = db.collection('users').doc(claimData.referrerId);
                    transaction.update(referrerRef, { balance: admin.firestore.FieldValue.increment(claimData.commissionAmount) });
                }
                
                // Handle new user bonus
                if (claimData.claimType === 'new_user_task' && claimData.newUserId && claimData.bonusAmount > 0) {
                    const newUserRef = db.collection('users').doc(claimData.newUserId);
                    transaction.update(newUserRef, { bonusBalance: admin.firestore.FieldValue.increment(claimData.bonusAmount) });
                }
            }
            // Update the claim status regardless
            transaction.update(claimRef, { status: newStatus });
        });
        return { success: true };
    } catch(error: any) {
        functions.logger.error('Error approving bonus claim:', error);
        if (error.code) throw error;
        throw new functions.https.HttpsError('internal', 'An error occurred while processing the claim.');
    }
});

export const suggestFriends = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }
  const userId = context.auth.uid;
  const db = admin.firestore();

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }
    const userData = userDoc.data()!;
    const friends = userData.friends || [];

    const sentReqSnapshot = await db.collection('friend_requests').where('fromId', '==', userId).get();
    const sentRequestIds = sentReqSnapshot.docs.map(doc => doc.data().toId);
    
    const receivedReqSnapshot = await db.collection('friend_requests').where('toId', '==', userId).get();
    const receivedRequestIds = receivedReqSnapshot.docs.map(doc => doc.data().fromId);

    const excludeIds = [userId, ...friends, ...sentRequestIds, ...receivedRequestIds];
    
    const usersRef = db.collection('users');
    const usersSnapshot = await usersRef.orderBy('wins', 'desc').limit(50).get();

    const suggestions = usersSnapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() }))
        .filter(u => u.uid && !excludeIds.includes(u.uid))
        .slice(0, 10)
        .map((u: any) => ({
            uid: u.uid,
            firstName: u.firstName || 'Unknown',
            lastName: u.lastName || 'User',
            photoURL: u.photoURL || '',
            status: u.status || 'offline',
            lastSeen: u.lastSeen || null,
        }));
    
    return suggestions;

  } catch (error) {
    functions.logger.error('Error suggesting friends:', error);
    throw new functions.https.HttpsError('internal', 'An error occurred while fetching friend suggestions.');
  }
});


export const sendFriendRequest = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const fromId = context.auth.uid;
    const { toId } = data;
    if (!toId) {
        throw new functions.https.HttpsError('invalid-argument', 'Recipient ID is required.');
    }

    const db = admin.firestore();
    
    const fromUserDoc = await db.collection('users').doc(fromId).get();
    const toUserDoc = await db.collection('users').doc(toId).get();

    if (!fromUserDoc.exists() || !toUserDoc.exists()) {
        throw new functions.https.HttpsError('not-found', 'One or both users not found.');
    }
    
    const fromUserData = fromUserDoc.data()!;
    const toUserData = toUserDoc.data()!;

    const fromName = `${fromUserData.firstName || 'User'} ${fromUserData.lastName || ''}`.trim();
    const fromAvatar = fromUserData.photoURL || '';
    const toName = `${toUserData.firstName || 'User'} ${toUserData.lastName || ''}`.trim();
    const toAvatar = toUserData.photoURL || '';
    
    const sentReqQuery = db.collection('friend_requests').where('fromId', '==', fromId).where('toId', '==', toId);
    const receivedReqQuery = db.collection('friend_requests').where('fromId', '==', toId).where('toId', '==', fromId);

    const [sentSnapshot, receivedSnapshot] = await Promise.all([sentReqQuery.get(), receivedReqQuery.get()]);

    if (!sentSnapshot.empty || !receivedSnapshot.empty) {
        throw new functions.https.HttpsError('already-exists', 'A friend request between you and this user is already pending.');
    }

    try {
        await db.collection('friend_requests').add({
            fromId,
            fromName,
            fromAvatar,
            toId,
            toName,
            toAvatar,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await db.collection('notifications').add({
            userId: toId,
            title: "New Friend Request",
            description: `${fromName} wants to be your friend.`,
            href: '/dashboard/friends',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
        });

        return { success: true };
    } catch (error) {
        functions.logger.error('Error sending friend request:', error);
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred.');
    }
});

    