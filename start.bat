@echo off
REM ================================================================================
REM Recipe Hunter - Unified Startup Script (Windows)
REM ================================================================================
REM
REM This script automatically detects and uses the best available runtime
REM (Node.js or Python) to start the Recipe Hunter server.
REM
REM Features:
REM   - Auto-detection of Node.js or Python
REM   - Network access support (local and LAN)
REM   - Detailed error messages and troubleshooting
REM   - Version checking
REM
REM Usage:
REM   - Double-click this file to start the server
REM   - Or run from command line: start.bat
REM
REM ================================================================================

setlocal enabledelayedexpansion

REM ================================================================================
REM SECTION 1: Display Welcome Banner
REM ================================================================================
echo.
echo ================================================================================
echo                      Recipe Hunter - Server Startup
echo ================================================================================
echo.
echo This script will start the Recipe Hunter server using the best available
echo runtime on your system (Node.js or Python).
echo.

REM ================================================================================
REM SECTION 2: Detect and Use Node.js (Preferred Runtime)
REM ================================================================================
REM Node.js is the preferred runtime for Recipe Hunter because it provides:
REM   - Better performance for concurrent connections
REM   - Native async/await support
REM   - Built-in HTTP server optimizations
REM   - File locking mechanisms for data integrity
REM ================================================================================

echo [1/3] Checking for Node.js...
echo.

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo    [FOUND] Node.js is installed
    echo.

    REM Display Node.js version
    echo    Runtime Information:
    for /f "delims=" %%i in ('node --version') do set NODE_VERSION=%%i
    echo       - Node.js Version: !NODE_VERSION!
    echo.

    REM Check if server.js exists
    if not exist "server.js" (
        echo    [ERROR] server.js not found in current directory
        echo.
        echo    Please ensure you are running this script from the RecipeHunter directory.
        echo.
        goto :error_end
    )

    echo [2/3] Starting Recipe Hunter server with Node.js...
    echo.
    echo ================================================================================
    echo                           Server Access Information
    echo ================================================================================
    echo.
    echo The server will display two URLs below:
    echo.
    echo   1. LOCALHOST ACCESS (This computer only):
    echo      http://localhost:8080
    echo      - Use this URL to access Recipe Hunter on this computer
    echo      - Works only on the machine running the server
    echo      - Fastest access method for local use
    echo.
    echo   2. NETWORK ACCESS (LAN/WiFi - Other devices):
    echo      http://[LOCAL-IP]:8080
    echo      - Use this URL to access from phones, tablets, other computers
    echo      - All devices must be on the same WiFi network
    echo      - The server will detect and display your local IP address
    echo.
    echo ================================================================================
    echo.
    echo [3/3] Initializing server...
    echo.

    REM Start the Node.js server
    node server.js

    REM If we get here, the server has stopped
    echo.
    echo ================================================================================
    echo Server has stopped.
    echo ================================================================================
    goto :normal_end
)

REM ================================================================================
REM SECTION 3: Fallback to Python (Alternative Runtime)
REM ================================================================================
REM If Node.js is not available, try to use Python as an alternative.
REM Python provides a simple HTTP server suitable for development use.
REM ================================================================================

echo    [NOT FOUND] Node.js is not installed
echo.
echo [1/3] Checking for Python...
echo.

REM Try python3 first
where python3 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set PYTHON_CMD=python3
    goto :found_python
)

REM Try python
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set PYTHON_CMD=python
    goto :found_python
)

REM Neither Node.js nor Python found
echo    [NOT FOUND] Python is not installed
echo.
goto :no_runtime

:found_python
REM ================================================================================
REM SECTION 4: Start Server with Python
REM ================================================================================

echo    [FOUND] Python is installed
echo.

REM Display Python version
echo    Runtime Information:
for /f "delims=" %%i in ('!PYTHON_CMD! --version') do set PYTHON_VERSION=%%i
echo       - Python Version: !PYTHON_VERSION!
echo.

REM Check if serve.py exists
if not exist "serve.py" (
    echo    [ERROR] serve.py not found in current directory
    echo.
    echo    Please ensure you are running this script from the RecipeHunter directory.
    echo.
    goto :error_end
)

echo [2/3] Starting Recipe Hunter server with Python...
echo.
echo ================================================================================
echo                           Server Access Information
echo ================================================================================
echo.
echo The server will display two URLs below:
echo.
echo   1. LOCALHOST ACCESS (This computer only):
echo      http://localhost:8080
echo      - Use this URL to access Recipe Hunter on this computer
echo      - Works only on the machine running the server
echo      - Fastest access method for local use
echo.
echo   2. NETWORK ACCESS (LAN/WiFi - Other devices):
echo      http://[LOCAL-IP]:8080
echo      - Use this URL to access from phones, tablets, other computers
echo      - All devices must be on the same WiFi network
echo      - The server will detect and display your local IP address
echo.
echo ================================================================================
echo.
echo [3/3] Initializing server...
echo.

REM Start the Python server
!PYTHON_CMD! serve.py

REM If we get here, the server has stopped
echo.
echo ================================================================================
echo Server has stopped.
echo ================================================================================
goto :normal_end

REM ================================================================================
REM SECTION 5: Error Handling - No Runtime Found
REM ================================================================================

:no_runtime
echo ================================================================================
echo                              INSTALLATION REQUIRED
echo ================================================================================
echo.
echo ERROR: No suitable runtime found!
echo.
echo Recipe Hunter requires either Node.js or Python to run.
echo Please install one of the following:
echo.
echo ────────────────────────────────────────────────────────────────────────────────
echo   OPTION 1: Node.js (Recommended)
echo ────────────────────────────────────────────────────────────────────────────────
echo.
echo   Download from: https://nodejs.org/
echo.
echo   Recommended version: LTS (Long Term Support)
echo   Installation is quick and easy with the installer
echo.
echo   Benefits:
echo     - Better performance and features
echo     - Full Recipe Hunter functionality
echo     - Automatic data sync and backup
echo     - Optimized for concurrent users
echo.
echo ────────────────────────────────────────────────────────────────────────────────
echo   OPTION 2: Python
echo ────────────────────────────────────────────────────────────────────────────────
echo.
echo   Download from: https://www.python.org/
echo.
echo   Recommended version: Python 3.8 or higher
echo   IMPORTANT: Check "Add Python to PATH" during installation!
echo.
echo ────────────────────────────────────────────────────────────────────────────────
echo.
echo After installation:
echo   1. Close this window
echo   2. Restart your computer (recommended)
echo   3. Run this script again
echo.
echo ================================================================================
echo.
goto :error_end

REM ================================================================================
REM SECTION 6: Exit Handlers
REM ================================================================================

:normal_end
REM Normal exit - server stopped gracefully
echo.
echo Press any key to close this window...
pause >nul
exit /b 0

:error_end
REM Error exit - something went wrong
echo.
echo Press any key to close this window...
pause >nul
exit /b 1
