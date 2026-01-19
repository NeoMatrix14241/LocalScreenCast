@echo off
setlocal enabledelayedexpansion

echo Generating SSL certificate using mkcert...

REM Get folder of this script
set "SCRIPT_DIR=%~dp0"

for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /R "IPv4" ^| findstr /V "Virtual" ^| findstr /V "VPN" ^| findstr /V "Docker"') do (
    set ip=%%A
    set ip=!ip:~1!
    goto :done
)

:done
echo Local IPv4 detected: %ip%

REM Use mkcert from the same folder
"%SCRIPT_DIR%mkcert.exe" -install
"%SCRIPT_DIR%mkcert.exe" -key-file "%SCRIPT_DIR%..\key.pem" -cert-file "%SCRIPT_DIR%..\cert.pem" %ip% localhost

echo Done.
