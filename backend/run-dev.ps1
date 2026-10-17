$ErrorActionPreference = 'Stop'

$taskJava21 = Join-Path $env:ProgramFiles 'Java\jdk-21'
if (Test-Path -LiteralPath $taskJava21) {
    $env:JAVA_HOME = $taskJava21
}

$taskComposeEnv = Join-Path $PSScriptRoot '..\infra\docker\.env'
if (Test-Path -LiteralPath $taskComposeEnv) {
    $taskDbSettings = Get-Content -Raw -LiteralPath $taskComposeEnv | ConvertFrom-StringData
    if (-not $env:DB_URL) {
        $env:DB_URL = "jdbc:postgresql://127.0.0.1:$($taskDbSettings.POSTGRES_PORT)/$($taskDbSettings.POSTGRES_DB)"
    }
    if (-not $env:DB_USERNAME) { $env:DB_USERNAME = $taskDbSettings.POSTGRES_USER }
    if (-not $env:DB_PASSWORD) { $env:DB_PASSWORD = $taskDbSettings.POSTGRES_PASSWORD }
}

Push-Location $PSScriptRoot
try {
    & mvn.cmd spring-boot:run '-Dspring-boot.run.profiles=dev' '-Dspring-boot.run.arguments=--debug=false'
    if ($LASTEXITCODE -ne 0) { throw 'Backend startup failed. Check Java 21 and PostgreSQL.' }
} finally {
    Pop-Location
}
