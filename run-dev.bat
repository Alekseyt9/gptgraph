@echo off
setlocal

if not exist node_modules (
    echo Installing dependencies...
    call npm install || goto :error
)

echo Building project...
call npm run build || goto :error

echo Launching browser at http://localhost:5173 ...
start "" "http://localhost:5173/"

echo Starting Vite dev server on http://localhost:5173 ...
call npm run dev || goto :error
goto :eof

:error
exit /b 1
