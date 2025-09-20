#!/bin/bash

# Firebase Index Setup Script for NabhaCare
# This script helps set up the required Firebase composite indexes

echo "🔥 Firebase Index Setup for NabhaCare"
echo "======================================"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed."
    echo "Please install it using: npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase."
    echo "Please login using: firebase login"
    exit 1
fi

echo "✅ Firebase CLI is installed and you're logged in."

# Check if firebase.json exists
if [ ! -f "firebase.json" ]; then
    echo "📝 Creating firebase.json..."
    cat > firebase.json << EOF
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
EOF
    echo "✅ firebase.json created."
else
    echo "✅ firebase.json already exists."
fi

# Check if firestore.indexes.json exists
if [ ! -f "firestore.indexes.json" ]; then
    echo "📝 Creating firestore.indexes.json..."
    cat > firestore.indexes.json << EOF
{
  "indexes": [
    {
      "collectionGroup": "reports",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "patientId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "reports",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "doctorId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "prescriptions",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "patientId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "prescriptions",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "doctorId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "consultations",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "patientId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "consultations",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "doctorId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
EOF
    echo "✅ firestore.indexes.json created."
else
    echo "✅ firestore.indexes.json already exists."
fi

# Check if firestore.rules exists
if [ ! -f "firestore.rules" ]; then
    echo "📝 Creating firestore.rules..."
    cat > firestore.rules << EOF
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read and write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Reports - patients can read their own reports, doctors can read/write reports they created
    match /reports/{reportId} {
      allow read: if request.auth != null && 
        (resource.data.patientId == request.auth.uid || 
         resource.data.doctorId == request.auth.uid);
      allow write: if request.auth != null && 
        (request.auth.uid == resource.data.doctorId || 
         request.auth.uid == resource.data.patientId);
    }
    
    // Prescriptions - similar to reports
    match /prescriptions/{prescriptionId} {
      allow read: if request.auth != null && 
        (resource.data.patientId == request.auth.uid || 
         resource.data.doctorId == request.auth.uid);
      allow write: if request.auth != null && 
        (request.auth.uid == resource.data.doctorId || 
         request.auth.uid == resource.data.patientId);
    }
    
    // Consultations
    match /consultations/{consultationId} {
      allow read: if request.auth != null && 
        (resource.data.patientId == request.auth.uid || 
         resource.data.doctorId == request.auth.uid);
      allow write: if request.auth != null && 
        (request.auth.uid == resource.data.doctorId || 
         request.auth.uid == resource.data.patientId);
    }
    
    // Medical centers - public read access
    match /medical_centers/{centerId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Pharmacy data - public read access
    match /pharmacies/{pharmacyId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    match /medicines/{medicineId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Chatbot sessions - users can only access their own
    match /chatbot_sessions/{sessionId} {
      allow read, write: if request.auth != null && 
        resource.data.patientId == request.auth.uid;
    }
  }
}
EOF
    echo "✅ firestore.rules created."
else
    echo "✅ firestore.rules already exists."
fi

echo ""
echo "🚀 Ready to deploy indexes!"
echo ""
echo "To deploy the indexes to Firebase, run:"
echo "  firebase deploy --only firestore:indexes"
echo ""
echo "To deploy everything (rules + indexes), run:"
echo "  firebase deploy --only firestore"
echo ""
echo "To check your current project, run:"
echo "  firebase use"
echo ""
echo "To switch to your project, run:"
echo "  firebase use nabhacare-48e2c"
echo ""

# Check current project
echo "📋 Current Firebase project:"
firebase use 2>/dev/null || echo "No project selected"

echo ""
echo "✨ Setup complete! The required indexes are now configured."
echo "   Deploy them when you're ready to fix the Firebase index errors."
