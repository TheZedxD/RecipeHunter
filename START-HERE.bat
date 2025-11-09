@echo off
REM Recipe Hunter - Quick Start Launcher
REM This batch file automatically detects and uses Node.js or Python

echo.
echo ========================================
echo   Recipe Hunter - Quick Start
echo ========================================
echo.
echo Detecting available runtime...
echo.

REM Check for Node.js first (preferred)
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Found: Node.js
    node --version
    echo.
    echo Starting server with Node.js...
    echo.
    echo The server will display the Network IP address below.
    echo Share this IP with other devices on your local network!
    echo.
    echo ========================================
    echo.
    node server.js
    goto :end
)

REM Check for Python3
where python3 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Found: Python 3
    python3 --version
    echo.
    echo Starting server with Python...
    echo.
    echo The server will display the Network IP address below.
    echo Share this IP with other devices on your local network!
    echo.
    echo ========================================
    echo.
    python3 serve.py
    goto :end
)

REM Check for Python
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Found: Python
    python --version
    echo.
    echo Starting server with Python...
    echo.
    echo The server will display the Network IP address below.
    echo Share this IP with other devices on your local network!
    echo.
    echo ========================================
    echo.
    python serve.py
    goto :end
)

REM No runtime found
echo ERROR: Neither Node.js nor Python is installed!
echo.
echo Please install one of the following:
echo   - Node.js: https://nodejs.org/
echo   - Python: https://www.python.org/
echo.
pause
exit /b 1

:end
echo.
echo Server has stopped.
pause
