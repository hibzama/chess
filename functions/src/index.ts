
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

// This new callable function will be triggered from the frontend after auth creation.
export const createDbUser = functions.https.onCall(async (data, context) => {
    // Check if the user is authenticated.
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { uid } = context.auth;
    const { 
        email, firstName, lastName, phone, address, 
        city, country, gender, photoURL,
        standardReferredBy, marketingReferredBy, campaignInfo 
    } = data;

    try {
        let ipAddress = 'unknown';
        if (context.rawRequest.ip) {
            ipAddress = context.rawRequest.ip;
        }
        
        const userRef = admin.firestore().doc(`users/${uid}`);
        
        const userData: any = {
            uid,
            email,
            firstName,
            lastName,
            phone,
            address,
            city,
            country,
            gender,
            photoURL,
            balance: 0,
            commissionBalance: 0,
            marketingBalance: 0,
            role: 'user',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            l1Count: 0,
            ipAddress: ipAddress,
            emailVerified: false, // User needs to verify their email
        };

        // Handle referral logic
        if (marketingReferredBy) {
          const marketerDoc = await admin.firestore().collection("users").doc(marketingReferredBy).get();
          if (marketerDoc.exists && marketerDoc.data()?.role === 'marketer') {
            const referralChain = (marketerDoc.data()?.referralChain || []).concat(marketingReferredBy);
            userData.referralChain = referralChain;
            userData.referredBy = marketingReferredBy;
          }
        } else if (standardReferredBy) {
          userData.referredBy = standardReferredBy;
        }

        if (campaignInfo) {
            userData.campaignInfo = {
                ...campaignInfo,
                completedTasks: [],
                answers: {},
            };
        }

        await userRef.set(userData);
        
        return { status: 'success', message: 'User created successfully in Firestore.' };

    } catch (error) {
        console.error("Error creating user in Firestore:", error);
        throw new functions.https.HttpsError('internal', 'Could not create user profile.');
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
