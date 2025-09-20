@echo off
echo 🚀 Deploying NabhaCare to Firebase Hosting...

echo 📦 Installing dependencies...
call npm install

echo 🔨 Building project...
call npm run build

echo 🌐 Deploying to Firebase...
call firebase deploy

echo ✅ Deployment complete!
echo 🌍 Your app is live at: https://nabhacare-48e2c.web.app
pause
