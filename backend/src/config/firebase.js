const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let firebaseApp;

try {
  // First, try to initialize with a service account file if it exists
  const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    // Use the service account file
    const serviceAccount = require(serviceAccountPath);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized successfully with service account file');
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL) {
    // Fall back to environment variables
    const firebaseCredentials = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? 
        process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    };
    
    if (!firebaseCredentials.privateKey) {
      console.warn('Firebase private key not provided or invalid format. Firebase authentication will not work properly.');
      console.warn('Please ensure your private key is in the correct PEM format in the .env file.');
    }
    
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(firebaseCredentials)
    });
    console.log('Firebase Admin SDK initialized successfully with environment variables');
  } else {
    console.warn('Firebase credentials not provided. Firebase authentication will not work.');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  console.warn('The application will continue, but Firebase authentication will not work.');
}

// Mock authentication functions for development without Firebase
const mockAuth = {
  createUser: async (userData) => {
    console.warn('Using mock Firebase auth - createUser');
    return { uid: 'mock-' + Date.now(), email: userData.email };
  },
  getUserByEmail: async (email) => {
    console.warn('Using mock Firebase auth - getUserByEmail');
    return { uid: 'mock-user', email };
  },
  updateUser: async (uid, userData) => {
    console.warn('Using mock Firebase auth - updateUser');
    return { uid, ...userData };
  },
  verifyIdToken: async (token) => {
    console.warn('Using mock Firebase auth - verifyIdToken');
    return { uid: 'mock-user', email: 'mock@example.com' };
  }
};

module.exports = {
  admin: {
    auth: () => {
      if (firebaseApp) {
        return admin.auth();
      } else {
        console.warn('Firebase not initialized, using mock auth functions');
        return mockAuth;
      }
    }
  },
  firebaseApp
}; 