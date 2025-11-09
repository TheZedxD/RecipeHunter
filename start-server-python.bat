@echo off
REM Recipe Hunter - Python Server Launcher
REM This batch file starts the Recipe Hunter server using Python

echo.
echo ========================================
echo   Recipe Hunter - Server Launcher
echo   (Python Version)
echo ========================================
echo.

REM Try to find Python (check python3 first, then python)
where python3 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set PYTHON_CMD=python3
    goto :found_python
)

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set PYTHON_CMD=python
    goto :found_python
)

REM Python not found
echo ERROR: Python is not installed or not in PATH
echo.
echo Please install Python from: https://www.python.org/
echo Make sure to check "Add Python to PATH" during installation
echo.
pause
exit /b 1

:found_python
REM Display Python version
echo Checking Python installation...
%PYTHON_CMD% --version
echo.

REM Start the server
echo Starting Recipe Hunter server...
echo.
echo The server will display the Network IP address below.
echo Share this IP with other devices on your local network!
echo.
echo ========================================
echo.

%PYTHON_CMD% serve.py

REM If server stops, pause so user can see any error messages
echo.
echo Server has stopped.
pause
