# Avvia un PostgreSQL temporaneo e lancia tutti i test QUnit, senza usare i dati di sviluppo.
$ErrorActionPreference = 'Stop'
$taskTestRun = 'bugboard26-qunit-tests-' + [guid]::NewGuid().ToString('N').Substring(0, 10)
$taskTestDb = "$taskTestRun-db"
$taskOldTestUrl = $env:TEST_DATABASE_URL
$taskDbCreated = $false

try {
    & docker run -d --name $taskTestDb -p 127.0.0.1::5432 `
        -e POSTGRES_DB=bugboard_tests -e POSTGRES_USER=bugboard_tests -e POSTGRES_PASSWORD=test-only-password `
        --health-cmd 'pg_isready -U bugboard_tests -d bugboard_tests' --health-interval 1s --health-retries 30 `
        postgres:17-alpine
    if ($LASTEXITCODE -ne 0) { throw 'Cannot start disposable PostgreSQL. Start Docker Desktop.' }
    $taskDbCreated = $true

    $taskReady = $false
    for ($taskAttempt = 0; $taskAttempt -lt 30; $taskAttempt++) {
        $taskHealth = & docker inspect --format '{{.State.Health.Status}}' $taskTestDb
        if ($taskHealth -eq 'healthy') { $taskReady = $true; break }
        Start-Sleep -Seconds 1
    }
    if (-not $taskReady) { throw 'Disposable PostgreSQL did not become ready.' }
    $taskEndpoint = & docker port $taskTestDb 5432/tcp
    if ($LASTEXITCODE -ne 0 -or $taskEndpoint -notmatch '^127\.0\.0\.1:(\d+)$') { throw 'Cannot detect test database port.' }
    $taskPort = $Matches[1]
    $env:TEST_DATABASE_URL = "postgresql://bugboard_tests:test-only-password@127.0.0.1:${taskPort}/bugboard_tests"

    Push-Location $PSScriptRoot
    try {
        & npm.cmd test
        if ($LASTEXITCODE -ne 0) { throw 'Backend tests failed.' }
    } finally { Pop-Location }
} finally {
    $env:TEST_DATABASE_URL = $taskOldTestUrl
    # Elimina soltanto il container con il nome casuale creato da questa esecuzione.
    if ($taskDbCreated) { & docker container rm -f -v $taskTestDb | Out-Null }
}
