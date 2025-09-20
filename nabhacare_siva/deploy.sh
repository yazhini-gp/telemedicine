#!/bin/bash

echo "🚀 Deploying NabhaCare to Firebase Hosting..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Deploy to Firebase
echo "🌐 Deploying to Firebase..."
firebase deploy

echo "✅ Deployment complete!"
echo "🌍 Your app is live at: https://nabhacare-48e2c.web.app"
