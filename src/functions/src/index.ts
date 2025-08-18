
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

// This function triggers whenever a new user document is created
export const onUserCreate = functions.firestore
  .document("users/{userId}")
  .onCreate(async (snap, context) => {
    const newUser = snap.data();
    const newUserRef = snap.ref;
    const { userId } = context.params;

    // --- Handle Commission Referral Logic ---
    const marketingReferrerId = newUser.marketingReferredBy; // mref
    const standardReferrerId = newUser.standardReferredBy; // ref (from campaign)

    if (marketingReferrerId) {
      const marketerDoc = await admin
        .firestore()
        .collection("users")
        .doc(marketingReferrerId)
        .get();
      if (marketerDoc.exists && marketerDoc.data()?.role === "marketer") {
        const referralChain = (marketerDoc.data()?.referralChain || []).concat(
          marketingReferrerId
        );
        await newUserRef.update({
          referralChain: referralChain,
          referredBy: marketingReferrerId,
        });
        functions.logger.log(
          `User ${userId} joined marketer ${marketingReferrerId}'s chain.`
        );
      }
    } else if (standardReferrerId) {
      await newUserRef.update({ referredBy: standardReferrerId });
      functions.logger.log(
        `User ${userId} was referred by standard user ${standardReferrerId}.`
      );
    }
    
    // Sign-up bonus logic is now handled by the onBonusClaim function,
    // which is triggered when the frontend creates a claim document.
    // No action is needed here for sign-up bonuses.

    return null;
  });

// This function triggers whenever a bonus claim is created
export const onBonusClaim = functions.firestore
  .document("{campaignCollection}/{campaignId}/claims/{claimId}")
  .onCreate(async (snap, context) => {
    const { campaignCollection, campaignId, claimId } = context.params;
    const db = admin.firestore();

    // For user-specific claims, userId is the claimId.
    // For transaction-specific claims (like deposit), claimId is the transactionId.
    const claimData = snap.data();
    const userId = claimData.userId;

    if (!userId) {
        functions.logger.error("Claim document is missing userId field.", {claimId});
        return null;
    }

    // Ensure it's a valid bonus campaign collection
    const validCollections = ['signup_bonus_campaigns', 'daily_bonus_campaigns', 'deposit_bonus_campaigns'];
    if (!validCollections.includes(campaignCollection)) {
      functions.logger.log(`Invalid collection for bonus claim: ${campaignCollection}`);
      return null;
    }

    try {
      await db.runTransaction(async (transaction) => {
        const campaignRef = db.collection(campaignCollection).doc(campaignId);
        const userRef = db.collection("users").doc(userId);

        const campaignDoc = await transaction.get(campaignRef);
        const userDoc = await transaction.get(userRef);

        if (!campaignDoc.exists || !userDoc.exists) {
          throw new Error("Campaign or User not found");
        }

        const campaign = campaignDoc.data();
        const user = userDoc.data();
        let bonusAmount = 0;
        let description = '';

        if (campaignCollection === 'signup_bonus_campaigns') {
            bonusAmount = campaign?.bonusAmount || 0;
            description = `Sign-up Bonus: ${campaign?.title}`;
        } else if (campaignCollection === 'daily_bonus_campaigns') {
            if (campaign?.bonusType === 'fixed') {
                bonusAmount = campaign.bonusValue;
            } else if (campaign?.bonusType === 'percentage') {
                bonusAmount = (user?.balance || 0) * (campaign.bonusValue / 100);
            }
            description = `Daily Bonus: ${campaign?.title}`;
        } else if (campaignCollection === 'deposit_bonus_campaigns') {
            // For deposit bonus, the claimId is the transactionId
            const depositTransactionRef = db.collection('transactions').doc(claimId);
            const depositTransactionDoc = await transaction.get(depositTransactionRef);
            if (!depositTransactionDoc.exists) {
                 throw new Error(`Deposit transaction ${claimId} not found.`);
            }
            const depositAmount = depositTransactionDoc.data()?.amount || 0;
            bonusAmount = depositAmount * (campaign?.percentage / 100);
            description = `Deposit Bonus: ${campaign?.title}`;
        } else {
             functions.logger.log("Unsupported campaign type for auto-payout.");
             return;
        }

        if (bonusAmount > 0) {
            // 1. Increment user's balance
            transaction.update(userRef, { balance: admin.firestore.FieldValue.increment(bonusAmount) });

            // 2. Create a transaction record
            const transactionRef = db.collection("transactions").doc();
            transaction.set(transactionRef, {
                userId: userId,
                type: 'bonus',
                amount: bonusAmount,
                status: 'completed',
                description: description,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

             // 3. Increment the campaign's claimsCount
            transaction.update(campaignRef, { claimsCount: admin.firestore.FieldValue.increment(1) });
        }
      });
      functions.logger.log(`Successfully processed bonus for user ${userId} from ${campaignCollection}.`);
    } catch (e) {
      functions.logger.error("Bonus claim transaction failed: ", e);
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
      // Use environment variables for sensitive data
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
    const siteUrl = "http://nexbattle.com"; // Consider making this configurable
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
