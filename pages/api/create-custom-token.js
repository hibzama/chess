
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// This simplified initialization is more robust for this environment.
if (!admin.apps.length) {
  try {
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
    // To verify the admin, we will check their user document in Firestore.
    // This is more reliable than custom claims in this context.
    const firestore = admin.firestore();
    const adminUserDoc = await firestore.collection('users').doc(adminUid).get();

    if (!adminUserDoc.exists || adminUserDoc.data().role !== 'admin') {
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
