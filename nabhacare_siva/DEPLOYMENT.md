# 🚀 NabhaCare Deployment Guide

## Quick Deployment

### Option 1: Using Deployment Scripts

**For Windows:**
```bash
deploy.bat
```

**For Linux/Mac:**
```bash
chmod +x deploy.sh
./deploy.sh
```

### Option 2: Manual Deployment

1. **Install Firebase CLI:**
```bash
npm install -g firebase-tools
```

2. **Login to Firebase:**
```bash
firebase login
```

3. **Install Dependencies:**
```bash
npm install
```

4. **Build the Project:**
```bash
npm run build
```

5. **Deploy to Firebase:**
```bash
firebase deploy
```

## 🔧 Project Configuration

### Firebase Project Details
- **Project ID**: nabhacare-48e2c
- **Web API Key**: AIzaSyDy0FkY9inKLpNBRghYKe8CAq5Sb4niwkM
- **Project Number**: 665549963978

### Environment Setup
- Node.js 16+ required
- Firebase CLI installed globally
- Firebase project initialized

## 📁 Project Structure
```
nabhacare/
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── robots.txt
├── src/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   ├── i18n/
│   ├── App.js
│   ├── App.css
│   └── index.js
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── package.json
├── tailwind.config.js
└── README.md
```

## 🌐 Live URLs

After deployment, your app will be available at:
- **Primary URL**: https://nabhacare-48e2c.web.app
- **Custom Domain**: https://nabhacare-48e2c.firebaseapp.com

## 🔐 Firebase Security Rules

The project includes comprehensive security rules:
- User authentication required
- Role-based access control
- Data validation and sanitization
- Secure CRUD operations

## 📱 Features Ready for Production

✅ **Authentication System**
- Email/password login
- Role-based access (Doctor/Patient)
- Secure user profiles

✅ **Real-time Features**
- Live consultation notifications
- Real-time status updates
- Offline data persistence

✅ **AI Symptom Checker**
- Comprehensive symptom analysis
- Emergency detection
- Personalized recommendations

✅ **Multilingual Support**
- English, Hindi, Punjabi
- Real-time language switching

✅ **Modern UI/UX**
- Glassmorphism design
- Dark/Light mode
- Responsive design
- Mobile optimized

## 🚨 Post-Deployment Checklist

1. **Test Authentication**
   - Register new users
   - Test role-based access
   - Verify profile creation

2. **Test Core Features**
   - Patient dashboard
   - Doctor dashboard
   - Consultation requests
   - Prescription generation

3. **Test AI Features**
   - Symptom checker
   - Emergency detection
   - Multilingual support

4. **Performance Check**
   - Page load times
   - Mobile responsiveness
   - Offline functionality

## 🔧 Troubleshooting

### Build Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Firebase Issues
```bash
# Re-authenticate
firebase logout
firebase login
firebase use nabhacare-48e2c
```

### Deployment Issues
```bash
# Check Firebase project
firebase projects:list
firebase use nabhacare-48e2c
firebase deploy --only hosting
```

## 📊 Monitoring

After deployment, monitor:
- Firebase Console for errors
- Google Analytics for usage
- Performance metrics
- User feedback

## 🎉 Success!

Your NabhaCare telemedicine platform is now live and ready to serve patients and doctors worldwide!

---

**Support**: For any deployment issues, check the Firebase Console or contact support.
