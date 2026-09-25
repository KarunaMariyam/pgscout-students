@echo off
setlocal
title PGScout - One Click Runner
cd /d "%~dp0"

echo.
echo ==========================================
echo              PGScout
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Install Node.js LTS from https://nodejs.org/ and run this file again.
  pause
  exit /b 1
)

if not exist "backend\.env" (
  echo backend\.env was not found.
  copy "backend\.env.example" "backend\.env" >nul
  echo.
  echo A backend\.env file was created.
  echo Open it and enter the Railway PUBLIC network values, then save it.
  notepad "backend\.env"
  echo.
  pause
)

if not exist "frontend\.env" (
  copy "frontend\.env.example" "frontend\.env" >nul
)

echo [1/4] Installing backend packages if needed...
pushd backend
if not exist "node_modules" call npm install
if errorlevel 1 goto :backend_fail

echo [2/4] Loading the PGScout database schema into Railway...
call npm run setup-db
if errorlevel 1 goto :backend_fail

echo [3/4] Loading demo data...
call npm run seed
if errorlevel 1 goto :backend_fail
popd

echo [4/4] Starting PGScout...
echo.
echo Backend will run at http://localhost:4000
echo Frontend will run at http://localhost:5173
echo.

start "PGScout Backend" cmd /k "cd /d ""%~dp0backend"" && npm run dev"

timeout /t 3 /nobreak >nul

pushd frontend
if not exist "node_modules" call npm install
if errorlevel 1 goto :frontend_fail
popd

start "PGScout Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

timeout /t 5 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo PGScout should now be open in your browser.
echo Keep both black terminal windows open while using the app.
echo.
pause
exit /b 0

:backend_fail
popd
echo.
echo Backend setup failed. Read the error above.
pause
exit /b 1

:frontend_fail
popd
echo.
echo Frontend installation failed. Read the error above.
pause
exit /b 1
