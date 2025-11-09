@echo off
REM Recipe Hunter - Node.js Server Launcher
REM This batch file starts the Recipe Hunter server using Node.js

echo.
echo ========================================
echo   Recipe Hunter - Server Launcher
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Display Node.js version
echo Checking Node.js installation...
node --version
echo.

REM Start the server
echo Starting Recipe Hunter server...
echo.
echo The server will display the Network IP address below.
echo Share this IP with other devices on your local network!
echo.
echo ========================================
echo.

node server.js

REM If server stops, pause so user can see any error messages
echo.
echo Server has stopped.
pause
