@echo off
set NODE_OPTIONS=--use-system-ca
echo Linking...
call vercel link --yes
if %errorlevel% neq 0 exit /b %errorlevel%
echo Deploying...
call vercel --prod --yes
