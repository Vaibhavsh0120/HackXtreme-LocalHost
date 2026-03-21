@echo off

:: Relaunch script in persistent terminal
if "%1" neq "run" (
    cmd /k "%~f0 run"
    exit /b
)

title React Native Development Runner

:: Enable ANSI colors
for /F %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
set GREEN=%ESC%[92m
set RED=%ESC%[91m
set YELLOW=%ESC%[93m
set RESET=%ESC%[0m

echo.
echo ==========================================
echo React Native Development Runner
echo ==========================================
echo.

:: STEP 1 - Kill Metro Ports Instantly
echo %YELLOW%[1/4] Clearing Metro ports...%RESET%

for /f "tokens=5" %%a in ('netstat -ano ^| find ":8081"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| find ":8082"') do taskkill /F /PID %%a >nul 2>&1

echo %GREEN%Metro ports cleared%RESET%
echo.

:: STEP 2 - Clean Gradle
echo %YELLOW%[2/4] Cleaning Android Gradle...%RESET%

if exist android\gradlew.bat (
    cd android
    call gradlew clean
    cd ..
    echo %GREEN%Gradle clean complete%RESET%
) else (
    echo %RED%gradlew not found%RESET%
)

echo.

:: STEP 3 - Start Metro Server
echo %YELLOW%[3/4] Starting Metro server...%RESET%

start "RN_METRO" cmd /k "npm start"

timeout /t 5 >nul

echo %GREEN%Metro started on port 8081%RESET%
echo.

:: STEP 4 - Run Android App
echo %YELLOW%[4/4] Launching Android build...%RESET%

start "RN_ANDROID" cmd /k "echo n | npx react-native run-android --no-packager"

echo %GREEN%Android build running%RESET%

echo.
echo ==========================================
echo Project Running
echo ==========================================
echo.
echo Metro and Android terminals started.
echo.
echo Wait execution to be complete on one of the terminal for app to run.
echo.

:WAIT
set /p INPUT=

if /I "%INPUT%"=="q" (
    echo %YELLOW%Stopping React Native processes...%RESET%

    taskkill /FI "WINDOWTITLE eq RN_METRO*" /T /F >nul 2>&1
    taskkill /FI "WINDOWTITLE eq RN_ANDROID*" /T /F >nul 2>&1

    echo %GREEN%All processes stopped%RESET%
    exit
)

goto WAIT