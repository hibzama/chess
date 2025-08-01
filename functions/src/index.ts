
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
  .onCreate(async (snap) => {
    const roomData = snap.data();
    const roomId = snap.id; // Get the document ID, which is our Room ID

    // Exit if the function is triggered with no data, or for a private room
    if (!roomData || roomData.isPrivate === true) {
      return null;
    }

    let telegramBotToken;
    try {
      telegramBotToken = functions.config().telegram.token;
    } catch (error) {
      functions.logger.error(
        "Could not retrieve telegram.token from Functions config. " +
        "Ensure it is set by running: " +
        "firebase functions:config:set telegram.token=\"YOUR_BOT_TOKEN\""
      );
      return null;
    }

    const chatId = "@nexbattlerooms"; // Your Telegram group username
    const siteUrl = "http://nexbattle.com"; // Your website's URL

    const gameType = roomData.gameType ?
      `${roomData.gameType.charAt(0).toUpperCase()}${roomData.gameType.slice(1)}`
      : "Game";
    const wager = roomData.wager || 0;
    const createdBy = roomData.createdBy?.name || "A Player";
    const timeControl = roomData.timeControl ? `${roomData.timeControl / 60} min` : "Not set";
    const gameLink = `${siteUrl}/game/multiplayer/${roomId}`;

    const message =
      `⚔️ <b>New Public ${gameType} Room!</b> ⚔️\n\n` +
      `<b>Player:</b> ${createdBy}\n` +
      `<b>Wager:</b> LKR ${wager.toFixed(2)}\n` +
      `<b>Time:</b> ${timeControl}\n\n` +
      `<i>Room ID:</i> <code>${roomId}</code>\n\n` +
      `<a href="${gameLink}">Click Here to Join Game</a>\n\n` +
      `<i>This room will expire in 3 minutes if no one joins.</i>`;

    const telegramApiUrl =
      `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;

    try {
      await axios.post(telegramApiUrl, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML', // Important to allow clickable links and bold text
      });
      functions.logger.log("Successfully sent message to Telegram.");
    } catch (error) {
      functions.logger.error("Error sending message to Telegram:", error);
    }

    return null;
  });
