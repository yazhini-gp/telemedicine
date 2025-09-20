# 🔥 Firebase Setup Guide for NabhaCare

## ✅ Current Configuration

**Project ID**: `nabhacare-48e2c`  
**Project Number**: `665549963978`

### Firebase Config (Updated)
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyCSnvux0wmoyqBKRG7P_MUdAzPDBqZDJjo",
  authDomain: "nabhacare-48e2c.firebaseapp.com",
  projectId: "nabhacare-48e2c",
  storageBucket: "nabhacare-48e2c.firebasestorage.app",
  messagingSenderId: "665549963978",
  appId: "1:665549963978:web:ef99ab93ffa243d684ea33"
};
```

## 🚀 Required Firebase Services Setup

### 1. Authentication Setup

**Enable Email/Password Authentication:**
1. Go to [Firebase Console](https://console.firebase.google.com/project/nabhacare-48e2c/authentication/providers)
2. Click "Authentication" → "Sign-in method"
3. Enable "Email/Password" provider
4. Click "Save"

**Configure Authorized Domains:**
- Add `localhost` for development
- Add your production domain when deploying

### 2. Firestore Database Setup

**Create Database:**
1. Go to [Firestore Database](https://console.firebase.google.com/project/nabhacare-48e2c/firestore)
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select location (closest to your users)

**Deploy Security Rules:**
```bash
firebase deploy --only firestore:rules
```

### 3. Storage Setup (Optional)

**Enable Storage:**
1. Go to [Storage](https://console.firebase.google.com/project/nabhacare-48e2c/storage)
2. Click "Get started"
3. Choose "Start in test mode"
4. Select location

## 🧪 Testing Firebase Connection

### Test Authentication
1. Navigate to `http://localhost:3001/test-auth`
2. Click "Test Firebase Authentication"
3. Check results in the component

### Test Database
1. Navigate to `http://localhost:3001/test-db`
2. Click "Test Database Connection"
3. Check results in the component

### Test Signup Process
1. Go to `http://localhost:3001/signup`
2. Fill out the form with test data
3. Check browser console for detailed logs
4. Verify user appears in Firebase Console

## 🔧 Troubleshooting

### Common Issues

#### 1. "Firebase: Error (auth/configuration-not-found)"
**Solution**: Check Firebase config in `src/services/firebase.js`

#### 2. "Firebase: Error (auth/unauthorized-domain)"
**Solution**: Add domain to authorized domains in Firebase Console

#### 3. "Firebase: Error (auth/email-already-in-use)"
**Solution**: This is normal - user already exists

#### 4. "Firebase: Error (firestore/permission-denied)"
**Solution**: Check Firestore security rules

### Debug Steps

1. **Check Browser Console**: Look for Firebase errors
2. **Check Network Tab**: Look for failed Firebase API calls
3. **Check Firebase Console**: Verify services are enabled
4. **Test Individual Components**: Use test routes

## 📋 Firebase Console Checklist

- [ ] Authentication enabled
- [ ] Email/Password provider enabled
- [ ] Firestore database created
- [ ] Security rules deployed
- [ ] Authorized domains configured
- [ ] Project billing enabled (if needed)

## 🚀 Deployment Commands

```bash
# Set Firebase project
firebase use nabhacare-48e2c

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy to hosting
firebase deploy --only hosting

# Deploy everything
firebase deploy
```

## 📞 Support

If you're still having issues:

1. **Check Firebase Status**: https://status.firebase.google.com/
2. **Review Firebase Documentation**: https://firebase.google.com/docs
3. **Check Project Quotas**: Firebase Console → Usage tab
4. **Contact Firebase Support**: Through Firebase Console

---

**Remember**: Always test with the test components first before trying the actual signup/login!
