
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

admin.initializeApp();


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
      functions.logger.error("Could not retrieve telegram.token from Functions config. Make sure it's set by running 'firebase functions:config:set telegram.token=YOUR_TOKEN'");
      return null;
    }
    
    if(!telegramBotToken) {
        functions.logger.error("Telegram bot token is not configured.");
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

// This function triggers whenever a bonus claim is created
export const onBonusClaim = functions.firestore
  .document("bonus_claims/{claimId}")
  .onCreate(async (snap, context) => {
    const claimData = snap.data();
    if (!claimData) {
      functions.logger.error("No data in claim document");
      return null;
    }

    const { campaignId, type } = claimData;

    if (!campaignId) {
      functions.logger.error(`Claim ${context.params.claimId} has no campaignId.`);
      return null;
    }
    
    let campaignCollectionName: string;
    
    // Determine the collection based on the claim type
    switch(type) {
        case 'signup':
            campaignCollectionName = 'signup_bonus_campaigns';
            break;
        case 'daily':
             return null;
        case 'referrer':
        case 'referee':
             campaignCollectionName = 'referral_campaigns';
            break;
        default:
            functions.logger.error(`Unknown claim type: ${type}`);
            return null;
    }

    const campaignRef = admin.firestore().doc(`${campaignCollectionName}/${campaignId}`);

    try {
        await campaignRef.update({
            claimsCount: admin.firestore.FieldValue.increment(1)
        });
        functions.logger.log(`Incremented claimsCount for campaign ${campaignId} in ${campaignCollectionName}`);
    } catch (error) {
        functions.logger.error(`Failed to increment claimsCount for campaign ${campaignId} in ${campaignCollectionName}`, error);
    }
    
    return null;
  });


export const claimDailyBonus = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { campaignId } = data;
    const userId = context.auth.uid;
    const db = admin.firestore();

    if (!campaignId) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a "campaignId".');
    }

    try {
        const result = await db.runTransaction(async (transaction) => {
            const campaignRef = db.doc(`daily_bonus_campaigns/${campaignId}`);
            const userRef = db.doc(`users/${userId}`);
            const claimRef = db.doc(`users/${userId}/daily_bonus_claims/${campaignId}`);
            
            const [campaignDoc, userDoc, claimDoc] = await transaction.getAll(campaignRef, userRef, claimRef);

            if (!campaignDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Bonus campaign not found.');
            }
            if (claimDoc.exists) {
                throw new functions.https.HttpsError('already-exists', 'You have already claimed this bonus today.');
            }
             if (!userDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'User data not found.');
            }

            const campaign = campaignDoc.data()!;
            const user = userDoc.data()!;
            const now = new Date();
            
            if (!campaign.isActive || campaign.endDate.toDate() < now) {
                throw new functions.https.HttpsError('failed-precondition', 'This bonus is no longer active.');
            }
            if ((campaign.claimsCount || 0) >= campaign.userLimit) {
                throw new functions.https.HttpsError('failed-precondition', 'This bonus has reached its claim limit.');
            }
            
            const currentBalance = user.balance || 0;
            if (campaign.eligibility === 'below' && currentBalance > campaign.balanceThreshold) {
                throw new functions.https.HttpsError('failed-precondition', `Your balance must be below LKR ${campaign.balanceThreshold} to claim.`);
            }
            if (campaign.eligibility === 'above' && currentBalance < campaign.balanceThreshold) {
                throw new functions.https.HttpsError('failed-precondition', `Your balance must be above LKR ${campaign.balanceThreshold} to claim.`);
            }
            
            let bonusAmount = 0;
            if (campaign.bonusType === 'fixed') {
                bonusAmount = campaign.bonusValue;
            } else if (campaign.bonusType === 'percentage') {
                bonusAmount = currentBalance * (campaign.bonusValue / 100);
            }

            if (bonusAmount <= 0) {
                 throw new functions.https.HttpsError('failed-precondition', 'Bonus amount must be greater than zero.');
            }
            
            transaction.set(claimRef, { userId, claimedAt: admin.firestore.FieldValue.serverTimestamp(), campaignId: campaignId });
            transaction.update(userRef, { balance: admin.firestore.FieldValue.increment(bonusAmount) });
            transaction.update(campaignRef, { claimsCount: admin.firestore.FieldValue.increment(1) });
            
            const transactionRef = db.collection('transactions').doc();
            transaction.set(transactionRef, {
                userId,
                type: 'bonus',
                amount: bonusAmount,
                status: 'completed',
                description: `Daily Bonus: ${campaign.title}`,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return { success: true, bonusAmount };
        });

        return result;

    } catch (error: any) {
        functions.logger.error("Error claiming daily bonus:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred. Please try again.');
    }
});
