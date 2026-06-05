@echo off
chcp 65001 >nul
echo ================================
echo   StarCatcher Starting...
echo ================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo ================================
echo.

cd /d "%~dp0"

start "StarCatcher-Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak >nul

start "StarCatcher-Frontend" cmd /k "cd /d %~dp0frontend && npx next dev --port 3000"

timeout /t 5 /nobreak >nul

echo Done! Windows will close in 3 seconds...
timeout /t 3 /nobreak >nul
exit
