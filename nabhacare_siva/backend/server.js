/**
 * Backend API Routes Example
 * Technology: Node.js, Express.js, Firebase Admin SDK
 * 
 * Example backend routes for login and data fetching
 */

const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();

// Initialize Firebase Admin SDK
const serviceAccount = require('./path/to/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://nabhacare-48e2c.firebaseio.com'
});

const db = admin.firestore();

// Middleware
app.use(cors());
app.use(express.json());

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Login route
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Firebase authentication is handled on the client side
    // This endpoint could be used for additional server-side validation
    res.json({ 
      message: 'Login successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get user profile
app.get('/api/user/:uid', authenticateToken, async (req, res) => {
  try {
    const { uid } = req.params;

    // Verify user can access this data
    if (req.user.uid !== uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    res.json({
      id: userDoc.id,
      ...userData,
      lastUpdated: userDoc.updateTime
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Get patient prescriptions
app.get('/api/prescriptions/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;

    // Verify user can access this data
    if (req.user.uid !== patientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const prescriptionsSnapshot = await db
      .collection('prescriptions')
      .where('patientId', '==', patientId)
      .orderBy('createdAt', 'desc')
      .get();

    const prescriptions = prescriptionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));

    res.json(prescriptions);
  } catch (error) {
    console.error('Get prescriptions error:', error);
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
});

// Get patient reports
app.get('/api/reports/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;

    // Verify user can access this data
    if (req.user.uid !== patientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const reportsSnapshot = await db
      .collection('reports')
      .where('patientId', '==', patientId)
      .orderBy('createdAt', 'desc')
      .get();

    const reports = reportsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));

    res.json(reports);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Create prescription
app.post('/api/prescriptions', authenticateToken, async (req, res) => {
  try {
    const prescriptionData = req.body;
    const { uid } = req.user;

    // Add metadata
    const newPrescription = {
      ...prescriptionData,
      patientId: uid,
      doctorId: prescriptionData.doctorId,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('prescriptions').add(newPrescription);
    
    res.status(201).json({
      id: docRef.id,
      ...newPrescription,
      message: 'Prescription created successfully'
    });
  } catch (error) {
    console.error('Create prescription error:', error);
    res.status(500).json({ error: 'Failed to create prescription' });
  }
});

// Create report
app.post('/api/reports', authenticateToken, async (req, res) => {
  try {
    const reportData = req.body;
    const { uid } = req.user;

    // Add metadata
    const newReport = {
      ...reportData,
      patientId: uid,
      doctorId: reportData.doctorId,
      status: 'completed',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('reports').add(newReport);
    
    res.status(201).json({
      id: docRef.id,
      ...newReport,
      message: 'Report created successfully'
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Update user profile
app.put('/api/user/:uid', authenticateToken, async (req, res) => {
  try {
    const { uid } = req.params;
    const updateData = req.body;

    // Verify user can update this data
    if (req.user.uid !== uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Add update timestamp
    const updatedData = {
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('users').doc(uid).update(updatedData);
    
    res.json({
      message: 'Profile updated successfully',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
