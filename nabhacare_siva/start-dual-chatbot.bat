@echo off
echo Starting NabhaCare Dual Chatbot System...
echo.

echo Starting AI Chatbot Server (Port 3001)...
start "AI Server" cmd /k "cd c\server && npm start"

echo Waiting for AI server to start...
timeout /t 3 /nobreak > nul

echo Starting Main Application (Port 3000)...
start "Main App" cmd /k "cd nabhacare_siva && npm start"

echo.
echo Both servers are starting...
echo - Main App: http://localhost:3000
echo - AI Server: http://localhost:3001
echo.
echo The chatbot will automatically detect network conditions and switch between:
echo - AI-powered mode (good connection)
echo - Rule-based mode (poor connection/offline)
echo.
pause
