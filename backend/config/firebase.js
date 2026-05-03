const admin = require('firebase-admin');

/**
 * Firebase Admin Initialization
 * Uses Application Default Credentials (ADC) for seamless Google Cloud integration.
 * In local development, ensure GOOGLE_APPLICATION_CREDENTIALS points to your key file.
 */
let db = null;
let auth = null;

try {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
    }
    db = admin.firestore();
    auth = admin.auth();
} catch (error) {
    console.warn("Firebase Admin could not be initialized. Some Google services may be unavailable.");
}

module.exports = { admin, db, auth };
