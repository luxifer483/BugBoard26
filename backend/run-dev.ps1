# Avvia il backend Node dalla sua cartella, leggendo la configurazione dal file .env.
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    & npm.cmd run dev
    if ($LASTEXITCODE -ne 0) { throw 'Backend startup failed. Check Node.js, PostgreSQL and backend/.env.' }
} finally {
    Pop-Location
}
