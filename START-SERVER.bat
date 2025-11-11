@echo off
REM ================================================================================
REM Recipe Hunter - Unified Server Startup Script for Windows
REM ================================================================================
REM
REM This comprehensive script combines all server startup functionality into one
REM easy-to-use batch file. It automatically detects and uses the best available
REM runtime (Node.js or Python) to start the Recipe Hunter server with full
REM support for local and network access.
REM
REM Features:
REM   - Automatic runtime detection (Node.js preferred, Python fallback)
REM   - Detailed version information and diagnostics
REM   - Network access support (localhost + LAN/WiFi)
REM   - Comprehensive error handling and troubleshooting
REM   - File existence validation
REM   - Clear user instructions and guidance
REM   - Proper exit handling for all scenarios
REM
REM Usage:
REM   - Double-click this file to start the server
REM   - Or run from command line: START-SERVER.bat
REM   - Press Ctrl+C to stop the server when running
REM
REM Network Access:
REM   - Localhost: http://localhost:8080 (this computer only)
REM   - Network: http://[YOUR-LOCAL-IP]:8080 (all devices on WiFi/LAN)
REM
REM ================================================================================

setlocal enabledelayedexpansion

REM ================================================================================
REM SECTION 1: Display Welcome Banner and Initialize
REM ================================================================================

cls
echo.
echo ================================================================================
echo                    RECIPE HUNTER - SERVER STARTUP SCRIPT
echo ================================================================================
echo.
echo This script will automatically detect and start the Recipe Hunter server
echo using the best available runtime on your Windows system.
echo.
echo Supported runtimes: Node.js (preferred) or Python (fallback)
echo.
echo ================================================================================
echo.

REM Store the script directory for file checks
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM ================================================================================
REM SECTION 2: Detect and Start with Node.js (Preferred Runtime)
REM ================================================================================
REM Node.js is the recommended runtime for Recipe Hunter because it provides:
REM   - Superior performance for concurrent connections
REM   - Native async/await support for modern JavaScript
REM   - Built-in HTTP server optimizations
REM   - Robust file locking for data integrity
REM   - Better WebSocket support for real-time features
REM   - Lower memory footprint for long-running servers
REM ================================================================================

echo [STEP 1/4] Checking for Node.js runtime...
echo.

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo    ✓ Node.js is installed
    echo.

    REM Get and display Node.js version
    echo    Runtime Information:
    for /f "delims=" %%i in ('node --version') do set NODE_VERSION=%%i
    echo       • Node.js Version: !NODE_VERSION!

    REM Get npm version if available
    where npm >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        for /f "delims=" %%i in ('npm --version') do set NPM_VERSION=%%i
        echo       • NPM Version: !NPM_VERSION!
    )
    echo.

    REM Validate that server.js exists
    echo [STEP 2/4] Validating server files...
    echo.

    if not exist "server.js" (
        echo    ✗ ERROR: server.js not found in current directory
        echo.
        echo    Current directory: %CD%
        echo.
        echo    Please ensure you are running this script from the RecipeHunter
        echo    root directory where server.js is located.
        echo.
        goto :error_end
    )

    echo    ✓ Server file found: server.js
    echo.

    REM Display network access information
    echo [STEP 3/4] Preparing network access information...
    echo.
    echo ================================================================================
    echo                          SERVER ACCESS INFORMATION
    echo ================================================================================
    echo.
    echo The Recipe Hunter server will be accessible via two URLs:
    echo.
    echo ────────────────────────────────────────────────────────────────────────────────
    echo   1. LOCAL ACCESS (This Computer Only)
    echo ────────────────────────────────────────────────────────────────────────────────
    echo.
    echo      URL: http://localhost:8080
    echo.
    echo      • Use this URL to access Recipe Hunter on this computer
    echo      • Works only on the machine running the server
    echo      • Fastest and most reliable access method for local use
    echo      • No network configuration required
    echo.
    echo ────────────────────────────────────────────────────────────────────────────────
    echo   2. NETWORK ACCESS (Other Devices on LAN/WiFi)
    echo ────────────────────────────────────────────────────────────────────────────────
    echo.
    echo      URL: http://[LOCAL-IP-ADDRESS]:8080
    echo.
    echo      • Use this URL to access from phones, tablets, and other computers
    echo      • All devices MUST be on the same WiFi network or LAN
    echo      • The server will automatically detect and display your local IP
    echo      • Perfect for testing mobile features and multi-device access
    echo.
    echo      IMPORTANT: Look for the "Network:" URL in the server output below
    echo      and share that URL with other devices on your network.
    echo.
    echo ────────────────────────────────────────────────────────────────────────────────
    echo.
    echo   Firewall Note: Windows may ask for firewall permission. Click "Allow"
    echo   to enable network access from other devices.
    echo.
    echo ================================================================================
    echo.

    REM Start the Node.js server
    echo [STEP 4/4] Starting Recipe Hunter server with Node.js...
    echo.
    echo ────────────────────────────────────────────────────────────────────────────────
    echo   SERVER OUTPUT (Press Ctrl+C to stop)
    echo ────────────────────────────────────────────────────────────────────────────────
    echo.

    node server.js

    REM Server has stopped - show exit message
    echo.
    echo ────────────────────────────────────────────────────────────────────────────────
    echo.
    echo ================================================================================
    echo                           SERVER HAS STOPPED
    echo ================================================================================
    echo.
    echo The Recipe Hunter server has been stopped.
    echo.
    echo To restart the server, simply run this script again.
    echo.
    goto :normal_end
)

REM ================================================================================
REM SECTION 3: Node.js Not Found - Try Python (Fallback Runtime)
REM ================================================================================
REM If Node.js is not available, attempt to use Python as a fallback runtime.
REM Python provides a simple but functional HTTP server suitable for development.
REM ================================================================================

echo    ✗ Node.js is not installed
echo.
echo [STEP 1/4] Checking for Python runtime...
echo.

REM Try python3 command first (common on some Windows installations)
where python3 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set PYTHON_CMD=python3
    goto :found_python
)

REM Try standard python command
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set PYTHON_CMD=python
    goto :found_python
)

REM Neither Node.js nor Python found - show installation instructions
echo    ✗ Python is not installed
echo.
goto :no_runtime

REM ================================================================================
REM SECTION 4: Python Found - Start Server with Python
REM ================================================================================

:found_python
echo    ✓ Python is installed
echo.

REM Get and display Python version
echo    Runtime Information:
for /f "delims=" %%i in ('!PYTHON_CMD! --version 2^>^&1') do set PYTHON_VERSION=%%i
echo       • !PYTHON_VERSION!
echo.

REM Validate that serve.py exists
echo [STEP 2/4] Validating server files...
echo.

if not exist "serve.py" (
    echo    ✗ ERROR: serve.py not found in current directory
    echo.
    echo    Current directory: %CD%
    echo.
    echo    Please ensure you are running this script from the RecipeHunter
    echo    root directory where serve.py is located.
    echo.
    goto :error_end
)

echo    ✓ Server file found: serve.py
echo.

REM Display network access information
echo [STEP 3/4] Preparing network access information...
echo.
echo ================================================================================
echo                          SERVER ACCESS INFORMATION
echo ================================================================================
echo.
echo The Recipe Hunter server will be accessible via two URLs:
echo.
echo ────────────────────────────────────────────────────────────────────────────────
echo   1. LOCAL ACCESS (This Computer Only)
echo ────────────────────────────────────────────────────────────────────────────────
echo.
echo      URL: http://localhost:8080
echo.
echo      • Use this URL to access Recipe Hunter on this computer
echo      • Works only on the machine running the server
echo      • Fastest and most reliable access method for local use
echo      • No network configuration required
echo.
echo ────────────────────────────────────────────────────────────────────────────────
echo   2. NETWORK ACCESS (Other Devices on LAN/WiFi)
echo ────────────────────────────────────────────────────────────────────────────────
echo.
echo      URL: http://[LOCAL-IP-ADDRESS]:8080
echo.
echo      • Use this URL to access from phones, tablets, and other computers
echo      • All devices MUST be on the same WiFi network or LAN
echo      • The server will automatically detect and display your local IP
echo      • Perfect for testing mobile features and multi-device access
echo.
echo      IMPORTANT: Look for the "Network:" URL in the server output below
echo      and share that URL with other devices on your network.
echo.
echo ────────────────────────────────────────────────────────────────────────────────
echo.
echo   Firewall Note: Windows may ask for firewall permission. Click "Allow"
echo   to enable network access from other devices.
echo.
echo ================================================================================
echo.

REM Start the Python server
echo [STEP 4/4] Starting Recipe Hunter server with Python...
echo.
echo ────────────────────────────────────────────────────────────────────────────────
echo   SERVER OUTPUT (Press Ctrl+C to stop)
echo ────────────────────────────────────────────────────────────────────────────────
echo.

!PYTHON_CMD! serve.py

REM Server has stopped - show exit message
echo.
echo ────────────────────────────────────────────────────────────────────────────────
echo.
echo ================================================================================
echo                           SERVER HAS STOPPED
echo ================================================================================
echo.
echo The Recipe Hunter server has been stopped.
echo.
echo To restart the server, simply run this script again.
echo.
goto :normal_end

REM ================================================================================
REM SECTION 5: No Runtime Found - Display Installation Instructions
REM ================================================================================

:no_runtime
echo ================================================================================
echo                         INSTALLATION REQUIRED
echo ================================================================================
echo.
echo ✗ ERROR: No suitable runtime found!
echo.
echo Recipe Hunter requires either Node.js or Python to run the server.
echo Neither runtime was detected on your system.
echo.
echo Please install one of the following runtimes:
echo.
echo ════════════════════════════════════════════════════════════════════════════════
echo   OPTION 1: Node.js (★ RECOMMENDED ★)
echo ════════════════════════════════════════════════════════════════════════════════
echo.
echo   Download: https://nodejs.org/
echo.
echo   Recommended Version: LTS (Long Term Support)
echo   Current LTS: v20.x or higher
echo.
echo   Why Node.js is recommended:
echo     ✓ Better performance and faster response times
echo     ✓ Full Recipe Hunter functionality and features
echo     ✓ Automatic data synchronization and backup
echo     ✓ Optimized for multiple concurrent users
echo     ✓ Better support for real-time updates
echo     ✓ Lower memory usage for long-running servers
echo.
echo   Installation Steps:
echo     1. Download the Windows installer (.msi) from nodejs.org
echo     2. Run the installer (use default settings)
echo     3. Restart your computer
echo     4. Run this START-SERVER.bat script again
echo.
echo ════════════════════════════════════════════════════════════════════════════════
echo   OPTION 2: Python (Alternative)
echo ════════════════════════════════════════════════════════════════════════════════
echo.
echo   Download: https://www.python.org/downloads/
echo.
echo   Recommended Version: Python 3.8 or higher
echo   Current Stable: Python 3.11 or 3.12
echo.
echo   Installation Steps:
echo     1. Download the Windows installer from python.org
echo     2. Run the installer
echo     3. ★ IMPORTANT: Check "Add Python to PATH" during installation!
echo     4. Complete the installation
echo     5. Restart your computer
echo     6. Run this START-SERVER.bat script again
echo.
echo   Note: Python provides basic functionality but Node.js is preferred
echo   for optimal performance and feature support.
echo.
echo ════════════════════════════════════════════════════════════════════════════════
echo.
echo Troubleshooting:
echo   • If you just installed Node.js or Python, restart your computer
echo   • Make sure the runtime was added to your system PATH
echo   • Open a new command prompt after installation to refresh PATH
echo   • Run 'node --version' or 'python --version' to verify installation
echo.
echo ================================================================================
echo.
goto :error_end

REM ================================================================================
REM SECTION 6: Exit Handlers
REM ================================================================================

:normal_end
REM Normal exit - server stopped gracefully or completed successfully
echo ================================================================================
echo.
echo Thank you for using Recipe Hunter!
echo.
echo Press any key to close this window...
pause >nul
exit /b 0

:error_end
REM Error exit - something went wrong
echo ================================================================================
echo.
echo An error occurred. Please read the messages above for details.
echo.
echo Press any key to close this window...
pause >nul
exit /b 1
