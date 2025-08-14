
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

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
        throw new HttpsError('internal', 'An unexpected error occurred while ending the game.');
    }
});

export const approveBonusClaim = onCall({ region: 'us-central1', cors: true }, async (request) => {
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
        logger.error('Error approving bonus claim:', error);
        if (error.code) throw error;
        throw new HttpsError('internal', 'An error occurred while processing the claim.');
    }
});

export const suggestFriends = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const userId = request.auth.uid;
    const db = admin.firestore();

    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new HttpsError('not-found', 'User not found');
        }
        const userData = userDoc.data()!;
        const friends = userData.friends || [];

        // Fetch IDs of users I have sent requests to
        const sentReqSnapshot = await db.collection('friend_requests').where('fromId', '==', userId).get();
        const sentRequestIds = sentReqSnapshot.docs.map(doc => doc.data().toId);
        
        // Fetch IDs of users who have sent requests to me
        const receivedReqSnapshot = await db.collection('friend_requests').where('toId', '==', userId).get();
        const receivedRequestIds = receivedReqSnapshot.docs.map(doc => doc.data().fromId);

        const excludeIds = [userId, ...friends, ...sentRequestIds, ...receivedRequestIds];

        const usersSnapshot = await db.collection('users').orderBy('wins', 'desc').limit(50).get();

        const suggestions = usersSnapshot.docs
            .map(doc => ({ uid: doc.id, ...doc.data() }))
            .filter(u => u.uid && !excludeIds.includes(u.uid))
            .slice(0, 10)
            .map(u => ({
                uid: u.uid,
                firstName: u.firstName || 'Unknown',
                lastName: u.lastName || 'User',
                photoURL: u.photoURL || '',
                status: u.status || 'offline',
                lastSeen: u.lastSeen || null,
            }));
        
        return suggestions;

    } catch (error) {
        logger.error('Error suggesting friends:', error);
        throw new HttpsError('internal', 'An error occurred while fetching friend suggestions.');
    }
});

export const sendFriendRequest = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const fromId = request.auth.uid;
    const { toId, toName, toAvatar } = request.data;
    
    if (!toId || !toName) {
        throw new HttpsError('invalid-argument', 'Recipient ID and name are required.');
    }

    const db = admin.firestore();

    try {
        const fromUserDoc = await db.collection('users').doc(fromId).get();
        if (!fromUserDoc.exists) {
            throw new HttpsError('not-found', 'Current user not found.');
        }
        const fromUserData = fromUserDoc.data()!;
        const fromName = `${fromUserData.firstName} ${fromUserData.lastName}`;
        const fromAvatar = fromUserData.photoURL || '';

        // Check if a request already exists in either direction
        const reqQuery1 = db.collection('friend_requests').where('fromId', '==', fromId).where('toId', '==', toId);
        const reqQuery2 = db.collection('friend_requests').where('fromId', '==', toId).where('toId', '==', fromId);

        const [snapshot1, snapshot2] = await Promise.all([reqQuery1.get(), reqQuery2.get()]);

        if (!snapshot1.empty || !snapshot2.empty) {
            throw new HttpsError('already-exists', 'A friend request with this user is already pending.');
        }

        // Create the friend request
        await db.collection('friend_requests').add({
            fromId,
            fromName,
            fromAvatar,
            toId,
            toName,
            toAvatar: toAvatar || '',
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Create a notification for the recipient
        await db.collection('notifications').add({
            userId: toId,
            title: "New Friend Request",
            description: `${fromName} wants to be your friend.`,
            href: '/dashboard/friends',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
        });

        return { success: true };
    } catch (error: any) {
        logger.error('Error sending friend request:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'An unexpected error occurred while sending the friend request.');
    }
});
