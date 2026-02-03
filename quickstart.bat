@echo off
REM FairTalk Quick Start Script for Windows

echo.
echo 🚀 Starting FairTalk Setup...
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js 14+ first.
    pause
    exit /b 1
)

echo.
echo 📦 Setting up backend...
cd backend
if not exist ".env" (
    copy .env.example .env
    echo Created .env file - please update it with your configuration
)

call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Backend installation failed
    pause
    exit /b 1
)
echo ✅ Backend dependencies installed

echo.
echo 📦 Setting up frontend...
cd ..\frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Frontend installation failed
    pause
    exit /b 1
)
echo ✅ Frontend dependencies installed

echo.
echo ✅ Setup complete!
echo.
echo 📝 Next steps:
echo    1. Update .env file in backend\ with your configuration
echo    2. Make sure Redis is running
echo    3. Start the backend: cd backend && npm run dev
echo    4. In another terminal, start frontend: cd frontend && npm run dev
echo    5. Open http://localhost:5173 in your browser
echo.
echo 📖 See WEBSOCKET_SETUP.md for detailed documentation
echo.
pause
