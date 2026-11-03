@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Please install Node.js 20 or newer first.
 pause
 exit /b 1
)
echo Starting local preview. Your browser will open automatically.
node server.mjs
if errorlevel 1 pause
