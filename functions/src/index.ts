
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

export const endGame = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { roomId, winnerId, method, resignerDetails } = request.data;
    if (!roomId || !method) {
        throw new HttpsError('invalid-argument', 'Room ID and end method are required.');
    }

    const db = admin.firestore();
    const roomRef = db.collection('game_rooms').doc(roomId);

    try {
        await db.runTransaction(async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists) throw new HttpsError('not-found', 'Game room not found.');

            const roomData = roomDoc.data();
            if (!roomData || roomData.status === 'completed') return;

            const wager = roomData.wager || 0;
            const creatorId = roomData.createdBy.uid;
            const joinerId = roomData.player2?.uid;
            
            if (!joinerId) throw new HttpsError('failed-precondition', 'Game is missing a second player.');

            let creatorPayout = 0, joinerPayout = 0;
            const winnerObject: any = { method };

            if (method === 'draw') {
                creatorPayout = joinerPayout = wager * 0.9;
                winnerObject.uid = null;
            } else if (method === 'resign' && resignerDetails) {
                let opponentPayoutRate = 1.05;
                let resignerRefundRate = 0.75;
                
                winnerObject.resignerId = resignerDetails.id;
                
                if (resignerDetails.id === creatorId) {
                    winnerObject.uid = joinerId;
                    creatorPayout = wager * resignerRefundRate;
                    joinerPayout = wager * opponentPayoutRate;
                } else {
                    winnerObject.uid = creatorId;
                    creatorPayout = wager * opponentPayoutRate;
                    joinerPayout = wager * resignerRefundRate;
                }
            } else {
                winnerObject.uid = winnerId;
                if (winnerId === creatorId) creatorPayout = wager * 1.8;
                else if (winnerId === joinerId) joinerPayout = wager * 1.8;
                if (winnerId) transaction.update(db.collection('users').doc(winnerId), { wins: admin.firestore.FieldValue.increment(1) });
            }
            
            if (creatorPayout > 0) transaction.update(db.collection('users').doc(creatorId), { balance: admin.firestore.FieldValue.increment(creatorPayout) });
            if (joinerPayout > 0) transaction.update(db.collection('users').doc(joinerId), { balance: admin.firestore.FieldValue.increment(joinerPayout) });
            
            transaction.update(roomRef, { status: 'completed', winner: winnerObject, draw: method === 'draw' });
        });
        return { success: true };
    } catch (error: any) {
        functions.logger.error('Error ending game:', error);
        throw new HttpsError('internal', 'An unexpected error occurred.');
    }
});
