# NabhaCare - Telemedicine Platform

A comprehensive telemedicine web application built with React and Firebase, featuring role-based dashboards, real-time consultations, AI-powered symptom checking, and multilingual support.

## Features

### 🔐 Authentication & Authorization
- Firebase Authentication with email/password
- Role-based access control (Doctor/Patient)
- Secure user profiles and data management

### 👨‍⚕️ Doctor Dashboard
- View and manage patient records
- Accept/reject consultation requests in real-time
- Generate digital prescriptions with billing
- Update availability status
- Track consultation history

### 👤 Patient Dashboard
- View medical records with offline persistence
- Request consultations (video, audio, text)
- Browse available doctors by specialization
- Receive digital prescriptions and bills
- Find nearest medical centers with Google Maps integration
- Check medicine availability

### 🤖 AI Symptom Checker
- Offline rule-based symptom analysis
- Online LLM integration (OpenAI/Gemini)
- Urgency level assessment (Emergency/Doctor consult/Self-care)
- Session history and recommendations

### 🌐 Multilingual Support
- English (default)
- Hindi (हिन्दी)
- Punjabi (ਪੰਜਾਬੀ)
- Real-time language switching

### 🎨 Modern UI/UX
- Glassmorphism design with TailwindCSS
- Dark/Light mode toggle
- Responsive design (mobile + desktop)
- Floating chatbot widget with Framer Motion
- Offline banner and status indicators

## Tech Stack

- **Frontend**: React 18, TailwindCSS, Framer Motion
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **State Management**: React Context API
- **Internationalization**: i18next
- **Deployment**: Firebase Hosting

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Navbar.js
│   ├── ProtectedRoute.js
│   ├── OfflineBanner.js
│   └── FloatingChatbot.js
├── context/            # React Context providers
│   ├── AuthContext.js
│   ├── ThemeContext.js
│   └── LanguageContext.js
├── hooks/              # Custom React hooks
│   └── useAuth.js
├── pages/              # Page components
│   ├── Login.js
│   ├── Signup.js
│   ├── PatientDashboard.js
│   ├── DoctorDashboard.js
│   ├── Records.js
│   ├── Consultations.js
│   ├── Prescriptions.js
│   ├── MedicalCenters.js
│   ├── Chatbot.js
│   └── Settings.js
├── services/           # Firebase services
│   ├── firebase.js
│   └── api.js
├── i18n/               # Internationalization
│   ├── index.js
│   └── locales/
│       ├── en.json
│       ├── hi.json
│       └── pa.json
├── App.js
├── App.css
└── index.js
```

## Firebase Configuration

The app is configured with the following Firebase project:
- **Project ID**: nabhacare-48e2c
- **Web API Key**: AIzaSyDy0FkY9inKLpNBRghYKe8CAq5Sb4niwkM

### Firestore Collections

1. **users** - User profiles and roles
2. **records** - Medical records
3. **consultations** - Consultation requests and history
4. **prescriptions** - Digital prescriptions
5. **medical_centers** - Medical center information
6. **chatbot_sessions** - AI symptom checker sessions

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase CLI

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nabhacare
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Firebase Setup

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in your project:
```bash
firebase init
```

4. Deploy to Firebase Hosting:
```bash
npm run build
firebase deploy
```

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm run build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm run eject` - Ejects from Create React App

## Features in Detail

### Authentication System
- Secure user registration and login
- Role-based routing and access control
- Profile management with specialization for doctors

### Real-time Features
- Live consultation request notifications
- Real-time status updates
- Offline data persistence

### AI Symptom Checker
- Comprehensive symptom analysis
- Emergency detection
- Personalized recommendations
- Session history tracking

### Medical Center Integration
- Location-based search
- Medicine availability checking
- Contact information and services
- Distance calculation

## Security

- Firebase Security Rules implemented
- Role-based data access
- Secure authentication
- Data validation and sanitization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, email support@nabhacare.com or create an issue in the repository.

---

Built with ❤️ for better healthcare accessibility.
