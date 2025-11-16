@echo off
REM ================================================================================
REM Recipe Hunter - Installation Script for Windows
REM ================================================================================
REM
REM This script checks for and helps install all dependencies required to run
REM Recipe Hunter on Windows 10/11.
REM
REM What this script checks/installs:
REM   - Node.js (LTS version) - Primary runtime for Recipe Hunter
REM   - npm (Node Package Manager) - Comes with Node.js
REM   - Python 3 (fallback runtime) - Optional but recommended
REM
REM Usage:
REM   - Double-click this file to run
REM   - Or run from command line: install-windows.bat
REM
REM Note: This script requires administrator privileges for some operations.
REM       If you see permission errors, right-click and "Run as Administrator"
REM
REM ================================================================================

setlocal enabledelayedexpansion

REM ================================================================================
REM SECTION 1: Welcome Banner
REM ================================================================================

cls
echo.
echo ================================================================================
echo              RECIPE HUNTER - INSTALLATION SCRIPT FOR WINDOWS
echo ================================================================================
echo.
echo This script will check for and help you install all dependencies required
echo to run Recipe Hunter on your Windows system.
echo.
echo The following will be checked/installed:
echo   * Node.js (LTS version) - Primary runtime
echo   * npm - Node Package Manager
echo   * Python 3 - Fallback runtime (optional)
echo.
echo ================================================================================
echo.
echo Press any key to continue, or Ctrl+C to cancel...
pause >nul

REM ================================================================================
REM SECTION 2: Check for Node.js
REM ================================================================================

cls
echo.
echo ================================================================================
echo [STEP 1/3] Checking for Node.js installation...
echo ================================================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo    [OK] Node.js is installed
    echo.
    for /f "delims=" %%i in ('node --version') do set NODE_VERSION=%%i
    echo    Current version: !NODE_VERSION!
    echo.

    where npm >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        for /f "delims=" %%i in ('npm --version') do set NPM_VERSION=%%i
        echo    npm version: !NPM_VERSION!
        echo.
    )

    echo    Node.js is already set up and ready to use!
    echo.
    set NODEJS_INSTALLED=1
) else (
    echo    [!] Node.js is NOT installed
    echo.
    echo    Node.js is required to run Recipe Hunter with full features.
    echo.
    set NODEJS_INSTALLED=0
)

echo ================================================================================
echo.
pause

REM ================================================================================
REM SECTION 3: Check for Python
REM ================================================================================

cls
echo.
echo ================================================================================
echo [STEP 2/3] Checking for Python installation...
echo ================================================================================
echo.

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo    [OK] Python is installed
    echo.
    for /f "delims=" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
    echo    Current version: !PYTHON_VERSION!
    echo.
    echo    Python is available as a fallback runtime!
    echo.
    set PYTHON_INSTALLED=1
) else (
    where python3 >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo    [OK] Python 3 is installed
        echo.
        for /f "delims=" %%i in ('python3 --version 2^>^&1') do set PYTHON_VERSION=%%i
        echo    Current version: !PYTHON_VERSION!
        echo.
        set PYTHON_INSTALLED=1
    ) else (
        echo    [!] Python is NOT installed
        echo.
        echo    Python is optional but recommended as a fallback runtime.
        echo.
        set PYTHON_INSTALLED=0
    )
)

echo ================================================================================
echo.
pause

REM ================================================================================
REM SECTION 4: Installation Summary and Instructions
REM ================================================================================

cls
echo.
echo ================================================================================
echo [STEP 3/3] Installation Summary
echo ================================================================================
echo.

if !NODEJS_INSTALLED! EQU 1 (
    if !PYTHON_INSTALLED! EQU 1 (
        REM Both Node.js and Python are installed
        echo ******************************************************************************
        echo                        INSTALLATION COMPLETE!
        echo ******************************************************************************
        echo.
        echo    [OK] All dependencies are installed and ready!
        echo.
        echo    You have both Node.js and Python installed, which means Recipe Hunter
        echo    will work perfectly on your system.
        echo.
        echo ================================================================================
        echo.
        echo You can now run Recipe Hunter using one of these methods:
        echo.
        echo   1. Double-click START-SERVER.bat (recommended)
        echo.
        echo   2. Or run from command line:
        echo      node server.js
        echo.
        echo   3. Or using npm:
        echo      npm start
        echo.
        echo The server will start on http://localhost:8080
        echo.
        echo ******************************************************************************
        echo.
        goto :end_success
    ) else (
        REM Only Node.js is installed
        echo ******************************************************************************
        echo                    INSTALLATION READY (Node.js Only)
        echo ******************************************************************************
        echo.
        echo    [OK] Node.js is installed - Recipe Hunter will work!
        echo    [!] Python is not installed (optional)
        echo.
        echo    Node.js is sufficient to run Recipe Hunter with full features.
        echo    Python is optional and only serves as a fallback runtime.
        echo.
        echo ================================================================================
        echo.
        echo You can now run Recipe Hunter using one of these methods:
        echo.
        echo   1. Double-click START-SERVER.bat (recommended)
        echo.
        echo   2. Or run from command line:
        echo      node server.js
        echo.
        echo The server will start on http://localhost:8080
        echo.
        echo ******************************************************************************
        echo.
        goto :end_success
    )
) else (
    if !PYTHON_INSTALLED! EQU 1 (
        REM Only Python is installed
        echo ******************************************************************************
        echo                 PARTIAL INSTALLATION (Python Only)
        echo ******************************************************************************
        echo.
        echo    [OK] Python is installed
        echo    [!] Node.js is NOT installed (recommended)
        echo.
        echo    Recipe Hunter will work with Python, but Node.js is recommended
        echo    for better performance and full features.
        echo.
        echo ================================================================================
        echo.
        echo To install Node.js (recommended):
        echo.
        echo   1. Visit: https://nodejs.org/
        echo   2. Download the LTS (Long Term Support) version
        echo   3. Run the installer (use default settings)
        echo   4. Restart your computer
        echo   5. Run this installation script again
        echo.
        echo ******************************************************************************
        echo.
        echo For now, you can run Recipe Hunter with Python:
        echo.
        echo   1. Double-click START-SERVER.bat
        echo.
        echo   2. Or run from command line:
        echo      python serve.py
        echo.
        echo ******************************************************************************
        echo.
        goto :end_partial
    ) else (
        REM Neither Node.js nor Python is installed
        echo ******************************************************************************
        echo                       INSTALLATION REQUIRED
        echo ******************************************************************************
        echo.
        echo    [!] ERROR: No suitable runtime found!
        echo.
        echo    Recipe Hunter requires either Node.js or Python to run.
        echo    Neither runtime was detected on your system.
        echo.
        echo ================================================================================
        echo.
        echo Please install one of the following runtimes:
        echo.
        echo ################################################################################
        echo   OPTION 1: Node.js (RECOMMENDED)
        echo ################################################################################
        echo.
        echo   Download: https://nodejs.org/
        echo.
        echo   Recommended Version: LTS (Long Term Support)
        echo   Current LTS: v20.x or higher
        echo.
        echo   Why Node.js is recommended:
        echo     * Better performance and faster response times
        echo     * Full Recipe Hunter functionality and features
        echo     * Automatic data synchronization and backup
        echo     * Optimized for multiple concurrent users
        echo     * Better support for real-time updates
        echo.
        echo   Installation Steps:
        echo     1. Download the Windows installer (.msi) from nodejs.org
        echo     2. Run the installer (use default settings)
        echo     3. Check "Automatically install necessary tools" if prompted
        echo     4. Restart your computer
        echo     5. Run this installation script again
        echo.
        echo ################################################################################
        echo   OPTION 2: Python (Alternative)
        echo ################################################################################
        echo.
        echo   Download: https://www.python.org/downloads/
        echo.
        echo   Recommended Version: Python 3.8 or higher
        echo   Current Stable: Python 3.11 or 3.12
        echo.
        echo   Installation Steps:
        echo     1. Download the Windows installer from python.org
        echo     2. Run the installer
        echo     3. IMPORTANT: Check "Add Python to PATH" during installation!
        echo     4. Complete the installation
        echo     5. Restart your computer
        echo     6. Run this installation script again
        echo.
        echo   Note: Python provides basic functionality but Node.js is preferred
        echo         for optimal performance and feature support.
        echo.
        echo ################################################################################
        echo.
        echo Troubleshooting:
        echo   * If you just installed Node.js or Python, restart your computer
        echo   * Make sure the runtime was added to your system PATH
        echo   * Open a new command prompt after installation to refresh PATH
        echo   * Run 'node --version' or 'python --version' to verify installation
        echo.
        echo ******************************************************************************
        echo.
        goto :end_error
    )
)

:end_success
echo ================================================================================
echo.
echo Thank you for installing Recipe Hunter!
echo.
echo Press any key to exit...
pause >nul
exit /b 0

:end_partial
echo ================================================================================
echo.
echo Installation partially complete.
echo.
echo Consider installing Node.js for the best experience.
echo.
echo Press any key to exit...
pause >nul
exit /b 0

:end_error
echo ================================================================================
echo.
echo Installation incomplete. Please install Node.js or Python and try again.
echo.
echo Press any key to exit...
pause >nul
exit /b 1
