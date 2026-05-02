// backend/config/firebase.js
const admin = require('firebase-admin');

// We will use a mock implementation if credentials are not provided
let db = null;

try {
    // If you have a service account JSON, you would load it here
    // const serviceAccount = require('../../path-to-service-account.json');
    // admin.initializeApp({
    //     credential: admin.credential.cert(serviceAccount)
    // });
    // db = admin.firestore();
    console.log("Firebase not fully configured yet. Using mock DB.");
} catch (error) {
    console.error("Error initializing Firebase:", error);
}

// Mock Database for development
const mockDB = {
    sessions: {},
    collection: function(colName) {
        return {
            doc: (docId) => {
                return {
                    set: async (data, options) => {
                        if (!this.sessions[colName]) this.sessions[colName] = {};
                        if (options && options.merge) {
                            this.sessions[colName][docId] = { ...this.sessions[colName][docId], ...data };
                        } else {
                            this.sessions[colName][docId] = data;
                        }
                        return true;
                    },
                    get: async () => {
                        const data = this.sessions[colName]?.[docId];
                        return {
                            exists: !!data,
                            data: () => data
                        };
                    }
                }
            }
        }
    }
};

module.exports = { db: db || mockDB };
