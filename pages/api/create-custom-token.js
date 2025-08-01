
import admin from 'firebase-admin';

// Correctly initialize Firebase Admin SDK
// This check ensures we don't re-initialize the app.
if (!admin.apps.length) {
  try {
    // When deployed, this will automatically use the project's service account.
    admin.initializeApp();
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
    const firestore = admin.firestore();
    const adminUserDoc = await firestore.collection('users').doc(adminUid).get();

    if (!adminUserDoc.exists || adminUserDoc.data().role !== 'admin') {
         return res.status(403).json({ error: 'Forbidden: You are not authorized to perform this action.' });
    }

    const customToken = await admin.auth().createCustomToken(uid);
    res.status(200).json({ token: customToken });

  } catch (error) {
    console.error('Error creating custom token:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
