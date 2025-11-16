@echo off
setlocal

if not exist node_modules ( 
    echo Installing dependencies...
    npm install || goto :error
)

echo Launching browser at http://localhost:5173 ...
start "" "http://localhost:5173/"

echo Starting Vite dev server on http://localhost:5173 ...
npm run dev

exit /b 0

:error
exit /b 1
