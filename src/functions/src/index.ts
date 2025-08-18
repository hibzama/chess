
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
    const db = admin.firestore();
    const { userId } = context.params;

    // --- 1. Handle Commission Referral Logic ---
    const marketingReferrerId = newUser.marketingReferredBy; // mref
    const standardReferrerId = newUser.standardReferredBy;   // ref (from campaign)

    if (marketingReferrerId) {
        // Direct referral from a marketer
        const updates: { [key: string]: any; } = {
            referralChain: [marketingReferrerId],
            referredBy: marketingReferrerId
        };
        await newUserRef.update(updates);
        functions.logger.log(`User ${userId} joined marketer ${marketingReferrerId}'s chain as Level 1.`);
    } else if (standardReferrerId) {
        // Referral from a standard user, likely via a campaign link.
        // We set referredBy, but the referralChain is only added
        // when the new user becomes a "valid referral".
        await newUserRef.update({ referredBy: standardReferrerId });
        functions.logger.log(`User ${userId} was referred by standard user ${standardReferrerId}. Chain will be updated upon validation.`);
    }
    
    // --- 2. Handle Sign-up Bonus ---
    try {
        const campaignsQuery = await db.collection('signup_bonus_campaigns')
                                        .where('isActive', '==', true)
                                        .get();

        if (!campaignsQuery.empty) {
            const campaignDoc = campaignsQuery.docs[0];
            const campaign = campaignDoc.data();
            
            const claimsRef = db.collection(`signup_bonus_campaigns/${campaignDoc.id}/claims`);
            const claimsSnapshot = await claimsRef.count().get();
            const claimsCount = claimsSnapshot.data().count;

            if (claimsCount < campaign.userLimit) {
                const batch = db.batch();
                
                batch.update(newUserRef, {
                    balance: admin.firestore.FieldValue.increment(campaign.bonusAmount),
                });
                
                // Creates a claim in the root bonus_claims collection
                const userClaimRef = db.collection('bonus_claims').doc();
                batch.set(userClaimRef, {
                    userId: userId,
                    campaignId: campaignDoc.id,
                    title: campaign.title,
                    amount: campaign.bonusAmount,
                    type: 'signup',
                    status: 'approved', // Sign-up bonuses are auto-approved
                    claimedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                const campaignClaimRef = db.doc(`signup_bonus_campaigns/${campaignDoc.id}/claims/${userId}`);
                batch.set(campaignClaimRef, {
                    userId: userId,
                    claimedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                const transactionRef = db.collection('transactions').doc();
                 batch.set(transactionRef, {
                    userId: userId,
                    type: 'bonus',
                    amount: campaign.bonusAmount,
                    status: 'completed',
                    description: `Sign-up Bonus: ${campaign.title}`,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                
                await batch.commit();
                functions.logger.log(`Awarded sign-up bonus of ${campaign.bonusAmount} to user ${userId} from campaign "${campaign.title}".`);
            } else {
                 functions.logger.log(`Sign-up bonus campaign "${campaign.title}" has reached its user limit.`);
            }
        }
    } catch(error) {
        functions.logger.error(`Error processing sign-up bonus for user ${userId}`, error);
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
