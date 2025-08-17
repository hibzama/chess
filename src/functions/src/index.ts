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

    // --- 1. Handle Bonus Referral Count ---
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

    // --- 2. Handle Commission Referral Logic (The main system) ---
    const marketingReferrerId = newUser.marketingReferredBy; // from mref link
    const standardReferrerId = newUser.standardReferredBy; // from ref link

    const referrerId = marketingReferrerId || standardReferrerId;

    if (referrerId) {
        const referrerRef = db.doc(`users/${referrerId}`);
        try {
            const referrerDoc = await referrerRef.get();
            if (referrerDoc.exists()) {
                const referrerData = referrerDoc.data()!;
                const updates: { [key: string]: any; } = {};

                // Construct the new user's referral chain
                const referrerChain = referrerData.referralChain || [];
                updates.referralChain = [...referrerChain, referrerId];
                
                // Set the direct referrer
                updates.referredBy = referrerId;
                
                // If the direct referrer is a standard user, increment their L1 count
                if (referrerData.role === 'user' && !marketingReferrerId) {
                    await referrerRef.update({
                        l1Count: admin.firestore.FieldValue.increment(1)
                    });
                     functions.logger.log(`Incremented l1Count for standard referrer ${referrerId}.`);
                }

                await newUserRef.update(updates);
                functions.logger.log(`User ${userId} referral chain and referredBy updated for referrer ${referrerId}.`);
            }
        } catch (error) {
            functions.logger.error(`Error processing commission referral for new user ${userId} from referrer ${referrerId}:`, error);
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