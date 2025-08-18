
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

// This function now only creates the basic user document.
// All other details are added by the user post-registration.
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
    try {
        const userRef = admin.firestore().doc(`users/${user.uid}`);
        
        await userRef.set({
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified,
            balance: 0,
            role: 'user',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            // Initialize other fields to sane defaults
            firstName: '',
            lastName: '',
            phone: '',
            address: '',
            city: '',
            country: '',
            gender: '',
            photoURL: '',
            commissionBalance: 0,
            marketingBalance: 0,
            l1Count: 0,
            wins: 0,
            friends: [],
        });
        
        console.log(`User document created for UID: ${user.uid}`);

    } catch (error) {
        console.error("Error creating user document in Firestore:", error);
    }
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
    
    let campaignRef;
    
    // Determine the collection based on the claim type
    switch(type) {
        case 'signup':
            campaignRef = admin.firestore().doc(`signup_bonus_campaigns/${campaignId}`);
            break;
        case 'daily':
            campaignRef = admin.firestore().doc(`daily_bonus_campaigns/${campaignId}`);
            break;
        case 'referrer':
        case 'referee':
             campaignRef = admin.firestore().doc(`referral_campaigns/${campaignId}`);
            break;
        default:
            functions.logger.error(`Unknown claim type: ${type}`);
            return null;
    }

    try {
        await campaignRef.update({
            claimsCount: admin.firestore.FieldValue.increment(1)
        });
        functions.logger.log(`Incremented claimsCount for campaign ${campaignId}`);
    } catch (error) {
        functions.logger.error(`Failed to increment claimsCount for campaign ${campaignId}`, error);
    }
    
    return null;
  });
