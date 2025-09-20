# 🔧 NabhaCare Database Troubleshooting Guide

## Database Connection Issues

### Common Problems & Solutions

#### 1. **Signup Not Working / Database Not Connected**

**Symptoms:**
- Signup form submits but user is not created
- Console shows Firebase errors
- User authentication works but profile not saved

**Solutions:**

##### A. Check Firebase Configuration
```javascript
// In src/services/firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyDy0FkY9inKLpNBRghYKe8CAq5Sb4niwkM",
  authDomain: "nabhacare-48e2c.firebaseapp.com",
  projectId: "nabhacare-48e2c",
  storageBucket: "nabhacare-48e2c.appspot.com",
  messagingSenderId: "665549963978",
  appId: "1:665549963978:web:nabhacare-app" // ✅ Fixed
};
```

##### B. Test Database Connection
1. Navigate to `http://localhost:3000/test-db`
2. Click "Test Database Connection"
3. Check console for detailed logs

##### C. Check Firestore Rules
```javascript
// In firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null;
    }
  }
}
```

#### 2. **Firebase Project Issues**

**Check Project Status:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `nabhacare-48e2c`
3. Verify project is active and billing is enabled

**Enable Required Services:**
- ✅ Authentication (Email/Password)
- ✅ Firestore Database
- ✅ Storage
- ✅ Hosting

#### 3. **Authentication Issues**

**Enable Authentication:**
1. Firebase Console → Authentication → Sign-in method
2. Enable "Email/Password" provider
3. Save changes

**Check Auth Domain:**
- Ensure `nabhacare-48e2c.firebaseapp.com` is authorized

#### 4. **Firestore Database Issues**

**Enable Firestore:**
1. Firebase Console → Firestore Database
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select location (closest to your users)

**Deploy Security Rules:**
```bash
firebase deploy --only firestore:rules
```

#### 5. **Network/Firewall Issues**

**Check Network:**
- Ensure internet connection is stable
- Check if corporate firewall blocks Firebase
- Try from different network

**Test Firebase Connectivity:**
```bash
# Test Firebase API
curl -I https://firestore.googleapis.com/v1/projects/nabhacare-48e2c/databases/(default)/documents
```

### Debugging Steps

#### Step 1: Check Console Logs
Open browser DevTools (F12) and check:
- Network tab for failed requests
- Console tab for error messages
- Application tab for Firebase config

#### Step 2: Test Individual Components
```javascript
// Test Firebase Auth
import { auth } from './services/firebase';
console.log('Auth instance:', auth);

// Test Firestore
import { db } from './services/firebase';
console.log('DB instance:', db);
```

#### Step 3: Verify User Creation Flow
1. Check if Firebase Auth user is created
2. Check if Firestore document is created
3. Check if user profile is retrieved

#### Step 4: Check Error Codes
Common Firebase error codes:
- `auth/email-already-in-use`
- `auth/weak-password`
- `firestore/permission-denied`
- `firestore/unavailable`

### Testing Commands

#### Test Database Connection
```bash
# Start development server
npm start

# Navigate to test page
http://localhost:3000/test-db
```

#### Test Signup Process
1. Go to signup page
2. Fill form with test data
3. Check browser console for logs
4. Check Firebase Console for new user

#### Test Firebase CLI
```bash
# Login to Firebase
firebase login

# Check project
firebase projects:list

# Use correct project
firebase use nabhacare-48e2c

# Deploy rules
firebase deploy --only firestore:rules
```

### Environment-Specific Issues

#### Development Environment
- Ensure `npm start` runs without errors
- Check localhost:3000 loads correctly
- Verify Firebase config in browser

#### Production Environment
- Check Firebase Hosting deployment
- Verify custom domain configuration
- Test from different devices/networks

### Quick Fixes

#### Reset Firebase Config
```javascript
// Clear browser cache
localStorage.clear();
sessionStorage.clear();

// Restart development server
npm start
```

#### Reinstall Dependencies
```bash
rm -rf node_modules package-lock.json
npm install
npm start
```

#### Check Firebase CLI
```bash
firebase --version
npm install -g firebase-tools
firebase login --reauth
```

### Still Having Issues?

1. **Check Firebase Status**: https://status.firebase.google.com/
2. **Review Firebase Documentation**: https://firebase.google.com/docs
3. **Check Project Quotas**: Firebase Console → Usage tab
4. **Contact Support**: Firebase Support or GitHub Issues

### Success Indicators

✅ **Database Connected Successfully When:**
- Test page shows "Database connection successful"
- Signup creates user in Firebase Auth
- User profile appears in Firestore
- Login works and loads user data
- No console errors

---

**Remember**: Always check the browser console first - it contains the most detailed error information!
