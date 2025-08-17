
'use server';
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

    // --- 1. Handle Bonus Referral Count (aref link) ---
    // This is for separate, one-time bonus campaigns and is independent.
    if (newUser.bonusReferredBy) {
      const bonusReferrerRef = db.doc(`users/${newUser.bonusReferredBy}`);
      try {
        await bonusReferrerRef.update({
          bonusReferralCount: admin.firestore.FieldValue.increment(1),
        });
        functions.logger.log(`Incremented bonusReferralCount for ${newUser.bonusReferredBy}`);
      } catch (error) {
        functions.logger.error(`Failed to increment bonusReferralCount for ${newUser.bonusReferredBy}`, error);
      }
    }

    // --- 2. Handle Commission Referral Logic (mref and ref links) ---
    const marketingReferrerId = newUser.marketingReferredBy;
    const standardReferrerId = newUser.standardReferredBy;

    // A marketer link (mref) takes precedence over a standard link (ref).
    const directReferrerId = marketingReferrerId || standardReferrerId;

    if (directReferrerId) {
      const referrerRef = db.doc(`users/${directReferrerId}`);
      try {
        const referrerDoc = await referrerRef.get();
        if (referrerDoc.exists()) {
          const referrerData = referrerDoc.data()!;
          const updates: { [key: string]: any; } = {};

          // Always set the direct referrer
          updates.referredBy = directReferrerId;

          // If the referrer is a marketer, the new user joins their chain.
          if (referrerData.role === 'marketer') {
            updates.referralChain = [directReferrerId];
            functions.logger.log(`User ${userId} joined marketer ${directReferrerId}'s chain.`);
          }
          // If the referrer is a standard user who is part of a marketer's chain,
          // the new user inherits that chain and adds the standard user to it.
          else if (referrerData.referralChain && referrerData.referralChain.length > 0) {
            updates.referralChain = [...referrerData.referralChain, directReferrerId];
            functions.logger.log(`User ${userId} inherited chain and added standard referrer ${directReferrerId}.`);
          }

          await newUserRef.update(updates);

          // If the direct referrer was a standard user (not a marketer), increment their L1 count.
          if (referrerData.role === 'user' && !marketingReferrerId) {
              await referrerRef.update({
                  l1Count: admin.firestore.FieldValue.increment(1)
              });
              functions.logger.log(`Incremented l1Count for standard referrer ${directReferrerId}.`);
          }
        } else {
            functions.logger.warn(`Referrer with ID ${directReferrerId} not found.`);
        }
      } catch (error) {
        functions.logger.error(`Error processing commission referral for new user ${userId} from referrer ${directReferrerId}:`, error);
      }
    }
    
    // --- 3. Handle Sign-up Bonus ---
    // This logic is independent of referrals and runs for every new user.
    try {
        const campaignsQuery = await db.collection('signup_bonus_campaigns')
                                        .where('isActive', '==', true)
                                        .get();

        if (!campaignsQuery.empty) {
            const campaignDoc = campaignsQuery.docs[0]; // Process the first active campaign found
            const campaign = campaignDoc.data();
            
            const claimsRef = db.collection(`signup_bonus_campaigns/${campaignDoc.id}/claims`);
            const claimsSnapshot = await claimsRef.count().get();
            const claimsCount = claimsSnapshot.data().count;

            if (claimsCount < campaign.userLimit) {
                const batch = db.batch();
                
                // Award bonus to user
                batch.update(newUserRef, {
                    balance: admin.firestore.FieldValue.increment(campaign.bonusAmount),
                });
                
                // Log the claim for the user
                const userClaimRef = db.doc(`users/${userId}/bonus_claims/${campaignDoc.id}`);
                batch.set(userClaimRef, {
                    campaignId: campaignDoc.id,
                    title: campaign.title,
                    amount: campaign.bonusAmount,
                    type: 'signup',
                    claimedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                // Log the claim in the campaign's subcollection for counting
                const campaignClaimRef = db.doc(`signup_bonus_campaigns/${campaignDoc.id}/claims/${userId}`);
                batch.set(campaignClaimRef, {
                    userId: userId,
                    claimedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                // Create a transaction log
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
