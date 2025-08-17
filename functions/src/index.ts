
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";
import * as cors from "cors";

const corsHandler = cors({ origin: true });

admin.initializeApp();

// This function triggers whenever a new user document is created
export const onUserCreate = functions.firestore
  .document("users/{userId}")
  .onCreate(async (snap, context) => {
    const newUser = snap.data();
    const newUserRef = snap.ref;
    
    // --- 1. Handle Bonus Referral Count ---
    if (newUser.bonusReferredBy) {
        const referrerId = newUser.bonusReferredBy;
        const referrerRef = admin.firestore().collection('users').doc(referrerId);
        
        try {
            await referrerRef.update({
                bonusReferralCount: admin.firestore.FieldValue.increment(1)
            });
            functions.logger.log(`Incremented bonusReferralCount for user ${referrerId}`);
        } catch (error) {
            functions.logger.error(`Failed to increment bonusReferralCount for user ${referrerId}:`, error);
        }
    }
    
    // --- 2. Handle Commission Referral Logic ---
    const directReferrerId = newUser.marketingReferredBy || newUser.standardReferredBy;
    if (directReferrerId && !newUser.campaignInfo) {
        const referrerRef = admin.firestore().collection('users').doc(directReferrerId);
        try {
            const referrerDoc = await referrerRef.get();
            if (referrerDoc.exists()) {
                const referrerData = referrerDoc.data()!;
                const updates: {[key: string]: any} = {
                    referredBy: directReferrerId,
                };

                if (referrerData.role === 'marketer') {
                    updates.referralChain = [...(referrerData.referralChain || []), directReferrerId];
                } else if (referrerData.role === 'user') {
                     // Only increment L1 count for standard user referrals
                     await referrerRef.update({ l1Count: admin.firestore.FieldValue.increment(1) });
                }
                
                // Set the referral chain on the new user
                await newUserRef.update(updates);
            }
        } catch (error) {
            functions.logger.error(`Error processing commission referral for user ${directReferrerId}:`, error);
        }
    }

    return null;
  });

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
      functions.logger.error("Could not retrieve telegram.token from Functions config.");
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

    const message = `⚔️ <b>New Public ${gameType} Room!</b> ⚔️\n\n` +
      `<b>Player:</b> ${createdBy}\n` +
      `<b>Wager:</b> LKR ${wager.toFixed(2)}\n` +
      `<b>Time:</b> ${timeControl}\n\n` +
      `<i>Room ID:</i> <code>${roomId}</code>\n\n` +
      `<a href="${gameLink}">Click Here to Join Game</a>\n\n` +
      `<i>This room will expire in 3 minutes if no one joins.</i>`;

    const telegramApiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;

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


export const joinGame = functions.https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        const { authToken, roomId, fundingWallet } = req.body.data;
        if (!authToken) {
            res.status(401).send({ error: "Unauthorized: Auth token is missing." });
            return;
        }
        if (!roomId || !fundingWallet) {
            res.status(400).send({ error: "Bad Request: Room ID and funding wallet are required." });
            return;
        }

        try {
            const decodedToken = await admin.auth().verifyIdToken(authToken);
            const joinerId = decodedToken.uid;
            
            const db = admin.firestore();
            const roomRef = db.collection('game_rooms').doc(roomId);

            await db.runTransaction(async (transaction) => {
                const roomDoc = await transaction.get(roomRef);
                if (!roomDoc.exists) throw new functions.https.HttpsError('not-found', "Room not available.");

                const roomData = roomDoc.data()!;
                if (roomData.status !== 'waiting') throw new functions.https.HttpsError('failed-precondition', "Room is not available for joining.");
                if (roomData.createdBy.uid === joinerId) throw new functions.https.HttpsError('failed-precondition', "You cannot join your own game.");

                const wager = roomData.wager || 0;
                const creatorId = roomData.createdBy.uid;

                const creatorRef = db.collection('users').doc(creatorId);
                const joinerRef = db.collection('users').doc(joinerId);

                const [creatorDoc, joinerDoc] = await Promise.all([
                    transaction.get(creatorRef),
                    transaction.get(joinerRef)
                ]);

                if (!creatorDoc.exists() || !joinerDoc.exists()) throw new functions.https.HttpsError('aborted', "One of the players could not be found.");
                
                const joinerData = joinerDoc.data()!;
                const joinerWalletField = fundingWallet === 'bonus' ? 'bonusBalance' : 'balance';

                if ((joinerData[joinerWalletField] || 0) < wager) throw new functions.https.HttpsError('failed-precondition', "You have insufficient funds.");
                
                transaction.update(joinerRef, { [joinerWalletField]: admin.firestore.FieldValue.increment(-wager) });

                const creatorColor = roomData.createdBy.color;
                const joinerColor = creatorColor === 'w' ? 'b' : 'w';
                
                transaction.update(roomRef, {
                    status: 'in-progress',
                    player2: { 
                        uid: joinerId, 
                        name: `${joinerData.firstName} ${joinerData.lastName}`, 
                        color: joinerColor, 
                        photoURL: joinerData.photoURL || '',
                        fundingWallet: fundingWallet,
                    },
                    players: admin.firestore.FieldValue.arrayUnion(joinerId),
                    turnStartTime: admin.firestore.FieldValue.serverTimestamp(),
                });
            });

            res.status(200).send({ data: { success: true } });

        } catch (error: any) {
            functions.logger.error('Error joining game:', error);
            if (error instanceof functions.https.HttpsError) {
                res.status(400).send({ error: { code: error.code, message: error.message } });
            } else {
                res.status(500).send({ error: "An unexpected error occurred." });
            }
        }
    });
});
