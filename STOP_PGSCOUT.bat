@echo off
echo Closing PGScout...
taskkill /FI "WINDOWTITLE eq PGScout Backend*" /T /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq PGScout Frontend*" /T /F >nul 2>nul
echo Done.
pause
