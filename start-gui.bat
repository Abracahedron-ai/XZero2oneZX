@echo off
REM Zero2oneZ GUI Startup Script (Batch version)
echo === Zero2oneZ GUI Startup ===
echo.

echo Starting services...
echo.

REM Start Python API on port 8001 (8000 may be occupied)
echo [1/3] Starting Python API on port 8001...
start "Python API" powershell -NoExit -Command "cd /d %~dp0src\backend\api && echo Python API starting on port 8001... && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8001"
timeout /t 2 /nobreak >nul

REM Start Next.js Renderer
echo [2/3] Starting Next.js Renderer on port 3000...
start "Next.js Renderer" powershell -NoExit -Command "cd /d %~dp0src\frontend\renderer && echo Next.js Renderer starting on port 3000... && npm run dev"
timeout /t 2 /nobreak >nul

REM Start Electron
echo [3/3] Starting Electron window...
start "Electron" powershell -NoExit -Command "cd /d %~dp0 && echo Electron starting... && npm run dev:electron"

echo.
echo === Services Started ===
echo All services are starting in separate windows.
echo.
echo Access points:
echo   - Browser: http://localhost:3000
echo   - API Docs: http://localhost:8001/docs
echo.
echo Note: First build of Next.js may take a few minutes.
echo.

