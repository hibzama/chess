
// This is a placeholder for a serverless function (e.g., Next.js API Route, Firebase Function)
// In a real application, this logic would be in a secure backend environment.

import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error.stack);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { uid, adminUid } = req.body;

  if (!uid || !adminUid) {
    return res.status(400).json({ error: 'User ID and Admin ID are required.' });
  }

  try {
    // Verify the requesting user is an admin
    const adminUserRecord = await admin.auth().getUser(adminUid);
    if (adminUserRecord.customClaims?.admin !== true) {
      return res.status(403).json({ error: 'Forbidden: You are not authorized to perform this action.' });
    }

    // Generate custom token for the target user
    const customToken = await admin.auth().createCustomToken(uid);
    res.status(200).json({ token: customToken });

  } catch (error) {
    console.error('Error creating custom token:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
