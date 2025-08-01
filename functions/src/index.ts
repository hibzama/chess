/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
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

    const gameType = roomData.gameType ?
      `${roomData.gameType.charAt(0).toUpperCase()}${roomData.gameType.slice(1)}`
      : "Game";
    const wager = roomData.wager || 0;
    const createdBy = roomData.createdBy?.name || "A Player";

    const message =
      `⚔️ New Public ${gameType} Room! ⚔️\n\n` +
      `Player: ${createdBy}\n` +
      `Wager: LKR ${wager.toFixed(2)}\n\n` +
      `Click to join and play!`;

    const telegramApiUrl =
      `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;

    try {
      await axios.post(telegramApiUrl, {
        chat_id: chatId,
        text: message,
      });
      functions.logger.log("Successfully sent message to Telegram.");
    } catch (error) {
      functions.logger.error("Error sending message to Telegram:", error);
    }

    return null;
  });
