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
    // This is for one-time bonus campaigns and is independent.
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

    // A marketer link (mref) takes precedence for starting a referral chain.
    if (marketingReferrerId) {
        try {
            await newUserRef.update({
                referralChain: [marketingReferrerId],
                referredBy: marketingReferrerId,
            });
            functions.logger.log(`New user ${userId} added to marketer ${marketingReferrerId}'s chain.`);
        } catch (error) {
             functions.logger.error(`Error processing MREF for user ${userId} from marketer ${marketingReferrerId}`, error);
        }
    } 
    // If no marketer link, process the standard referral link.
    else if (standardReferrerId) {
        const referrerRef = db.doc(`users/${standardReferrerId}`);
        try {
            const referrerDoc = await referrerRef.get();
            if (referrerDoc.exists()) {
                const referrerData = referrerDoc.data()!;
                const newUserData: {[k: string]: any} = { referredBy: standardReferrerId };

                // If the standard referrer is part of a chain, the new user joins it.
                if (referrerData.referralChain && referrerData.referralChain.length > 0) {
                    newUserData.referralChain = [...referrerData.referralChain, standardReferrerId];
                }
                
                // Update the new user with their direct referrer and chain (if any)
                await newUserRef.update(newUserData);

                // Increment the L1 count for the standard referrer
                await referrerRef.update({ l1Count: admin.firestore.FieldValue.increment(1) });
                functions.logger.log(`Processed REF for user ${userId} from standard user ${standardReferrerId}.`);
            }
        } catch (error) {
             functions.logger.error(`Error processing REF for user ${userId} from standard user ${standardReferrerId}`, error);
        }
    }

    // --- 3. Handle Sign-up Bonus ---
    // This logic is independent of referrals.
    try {
        const settingsDoc = await db.doc('settings/signupBonusConfig').get();
        if (settingsDoc.exists()) {
            const config = settingsDoc.data();
            if (config && config.enabled && config.bonusAmount > 0) {
                 const usersCountSnap = await db.collection('users').count().get();
                 const userCount = usersCountSnap.data().count;

                if (userCount <= config.userLimit) {
                    await newUserRef.update({
                        balance: admin.firestore.FieldValue.increment(config.bonusAmount),
                    });
                     await db.collection("transactions").add({
                        userId: userId,
                        type: 'bonus',
                        amount: config.bonusAmount,
                        status: 'completed',
                        description: 'Sign-up Bonus',
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    functions.logger.log(`Awarded sign-up bonus of ${config.bonusAmount} to user ${userId}.`);
                }
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
