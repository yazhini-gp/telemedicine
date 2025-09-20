# Firebase Index Setup Script for NabhaCare (PowerShell)
# This script helps set up the required Firebase composite indexes

Write-Host "🔥 Firebase Index Setup for NabhaCare" -ForegroundColor Red
Write-Host "======================================" -ForegroundColor Red

# Check if Firebase CLI is installed
try {
    $firebaseVersion = firebase --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Firebase CLI not found"
    }
    Write-Host "✅ Firebase CLI is installed: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase CLI is not installed." -ForegroundColor Red
    Write-Host "Please install it using: npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

# Check if user is logged in
try {
    firebase projects:list 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Not logged in"
    }
    Write-Host "✅ Logged in to Firebase." -ForegroundColor Green
} catch {
    Write-Host "❌ Not logged in to Firebase." -ForegroundColor Red
    Write-Host "Please login using: firebase login" -ForegroundColor Yellow
    exit 1
}

# Check if firebase.json exists
if (-not (Test-Path "firebase.json")) {
    Write-Host "📝 Creating firebase.json..." -ForegroundColor Blue
    $firebaseConfig = @"
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
"@
    $firebaseConfig | Out-File -FilePath "firebase.json" -Encoding UTF8
    Write-Host "✅ firebase.json created." -ForegroundColor Green
} else {
    Write-Host "✅ firebase.json already exists." -ForegroundColor Green
}

# Check if firestore.indexes.json exists
if (-not (Test-Path "firestore.indexes.json")) {
    Write-Host "📝 Creating firestore.indexes.json..." -ForegroundColor Blue
    $indexesConfig = @"
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
"@
    $indexesConfig | Out-File -FilePath "firestore.indexes.json" -Encoding UTF8
    Write-Host "✅ firestore.indexes.json created." -ForegroundColor Green
} else {
    Write-Host "✅ firestore.indexes.json already exists." -ForegroundColor Green
}

# Check if firestore.rules exists
if (-not (Test-Path "firestore.rules")) {
    Write-Host "📝 Creating firestore.rules..." -ForegroundColor Blue
    $rulesConfig = @"
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
"@
    $rulesConfig | Out-File -FilePath "firestore.rules" -Encoding UTF8
    Write-Host "✅ firestore.rules created." -ForegroundColor Green
} else {
    Write-Host "✅ firestore.rules already exists." -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Ready to deploy indexes!" -ForegroundColor Green
Write-Host ""
Write-Host "To deploy the indexes to Firebase, run:" -ForegroundColor Yellow
Write-Host "  firebase deploy --only firestore:indexes" -ForegroundColor Cyan
Write-Host ""
Write-Host "To deploy everything (rules + indexes), run:" -ForegroundColor Yellow
Write-Host "  firebase deploy --only firestore" -ForegroundColor Cyan
Write-Host ""
Write-Host "To check your current project, run:" -ForegroundColor Yellow
Write-Host "  firebase use" -ForegroundColor Cyan
Write-Host ""
Write-Host "To switch to your project, run:" -ForegroundColor Yellow
Write-Host "  firebase use nabhacare-48e2c" -ForegroundColor Cyan
Write-Host ""

# Check current project
Write-Host "📋 Current Firebase project:" -ForegroundColor Blue
try {
    $currentProject = firebase use 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host $currentProject -ForegroundColor White
    } else {
        Write-Host "No project selected" -ForegroundColor Yellow
    }
} catch {
    Write-Host "No project selected" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✨ Setup complete! The required indexes are now configured." -ForegroundColor Green
Write-Host "   Deploy them when you're ready to fix the Firebase index errors." -ForegroundColor Green
