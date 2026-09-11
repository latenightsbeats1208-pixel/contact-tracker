@echo off
rem Lanceur Contact Tracker : demarre le serveur si besoin puis ouvre le navigateur
cd /d "%~dp0"

rem Serveur deja lance ?
powershell -NoProfile -Command "try{(Invoke-WebRequest -UseBasicParsing http://localhost:3200 -TimeoutSec 2)|Out-Null;exit 0}catch{exit 1}"
if %errorlevel%==0 goto open

start "Contact Tracker (serveur - ne pas fermer)" /min cmd /c "npm run dev"

rem Attente du serveur (max ~30 s)
set /a tries=0
:wait
set /a tries+=1
if %tries% gtr 30 goto open
powershell -NoProfile -Command "Start-Sleep -Seconds 1; try{(Invoke-WebRequest -UseBasicParsing http://localhost:3200 -TimeoutSec 2)|Out-Null;exit 0}catch{exit 1}"
if %errorlevel% neq 0 goto wait

:open
start http://localhost:3200
exit /b 0
