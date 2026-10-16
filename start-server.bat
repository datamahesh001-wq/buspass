@echo off
title BusPass Backend Server
cd /d "%~dp0backend"

REM Already running? Then do not start a second copy
netstat -ano | findstr :5000 | findstr LISTENING >nul 2>&1
if %errorlevel%==0 (
    curl.exe -fsS http://localhost:5000/api/admin/dashboard >nul 2>&1
    if %errorlevel%==0 (
        echo.
        echo  BusPass server is ALREADY RUNNING on port 5000. Nothing to do.
        echo.
        timeout /t 3 >nul
        exit /b
    )
    echo  An older or different service is using port 5000. Replacing it...
    for /f "tokens=5" %%P in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do taskkill /PID %%P /F >nul 2>&1
)

echo ==========================================
echo   Starting BusPass Backend Server...
echo   URL: http://localhost:5000
echo   (Close this window to stop the server)
echo ==========================================
node server.js
pause