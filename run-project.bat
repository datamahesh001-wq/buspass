@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo       AP BUS PASS MANAGEMENT SYSTEM
echo ==========================================
echo.
echo Starting backend server...
start "AP BusPass Backend" cmd /k "cd /d "%~dp0BusPass\backend" && node server.js"

timeout /t 3 /nobreak >nul

echo Opening Bus Pass application...
start "" "http://localhost:5000/"

echo.
echo Project URL: http://localhost:5000/
echo Keep the backend window open while using the project.
echo.
endlocal
