@echo off

:: Relaunch inside persistent terminal
if "%1" neq "run" (
    cmd /k "%~f0 run"
    exit /b
)

title Android Emulator Check

:: Enable colors
for /F %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
set GREEN=%ESC%[92m
set RED=%ESC%[91m
set YELLOW=%ESC%[93m
set RESET=%ESC%[0m

echo.
echo ==========================================
echo Android Emulator Availability Check
echo ==========================================
echo.

:: Detect Android SDK
if defined ANDROID_HOME (
    set SDK=%ANDROID_HOME%
) else if exist "%LOCALAPPDATA%\Android\Sdk" (
    set SDK=%LOCALAPPDATA%\Android\Sdk
)

if not defined SDK (
    echo %RED%Android SDK not detected%RESET%
    echo Install Android Studio first.
    pause
    exit
)

:: Emulator executable
set EMULATOR=%SDK%\emulator\emulator.exe

if not exist "%EMULATOR%" (
    echo %RED%Android emulator tool not found%RESET%
    echo Install it from Android Studio -> SDK Manager -> SDK Tools
    pause
    exit
)

echo %YELLOW%Checking available Android Virtual Devices...%RESET%
echo.

set COUNT=0

for /f "delims=" %%a in ('"%EMULATOR%" -list-avds') do (
    set /a COUNT+=1
)

if %COUNT% GTR 0 (
    echo %GREEN%Emulator(s) detected on this system%RESET%
    echo You can run the project normally.
) else (
    echo %RED%No Android emulator found%RESET%
    echo.
    echo Please create one in Android Studio:
    echo.
    echo Android Studio
    echo → Device Manager
    echo → Create Device
    echo → Select Pixel 6
    echo → Select API Level 33
)

echo.
pause