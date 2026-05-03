const admin = require('firebase-admin');

/**
 * Firebase Admin Initialization
 * Uses Application Default Credentials (ADC) for seamless Google Cloud integration.
 * In local development, ensure GOOGLE_APPLICATION_CREDENTIALS points to your key file.
 */
try {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
    }
} catch (error) {
    console.warn("Firebase Admin could not be initialized with default credentials. Using mock mode.");
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
