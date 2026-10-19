$ErrorActionPreference = 'Stop'

# Disposable test resources. No host ports, development DB volumes or Docker socket mounts.
$taskTestRun = 'bugboard26-tests-' + [guid]::NewGuid().ToString('N').Substring(0, 10)
$taskTestDb = "$taskTestRun-db"
$taskTestRunner = "$taskTestRun-maven"
$taskBackendPath = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$taskNetworkCreated = $false
$taskDatabaseCreated = $false

try {
    & docker network create $taskTestRun
    if ($LASTEXITCODE -ne 0) { throw 'Cannot create test network. Start Docker Desktop.' }
    $taskNetworkCreated = $true

    & docker run -d --name $taskTestDb --network $taskTestRun `
        -e POSTGRES_DB=bugboard_tests -e POSTGRES_USER=bugboard_tests -e POSTGRES_PASSWORD=test-only-password `
        --health-cmd 'pg_isready -U bugboard_tests -d bugboard_tests' --health-interval 1s --health-retries 30 `
        postgres:17-alpine
    if ($LASTEXITCODE -ne 0) { throw 'Cannot start disposable PostgreSQL.' }
    $taskDatabaseCreated = $true

    $taskReady = $false
    for ($taskAttempt = 0; $taskAttempt -lt 30; $taskAttempt++) {
        $taskHealth = & docker inspect --format '{{.State.Health.Status}}' $taskTestDb
        if ($taskHealth -eq 'healthy') { $taskReady = $true; break }
        Start-Sleep -Seconds 1
    }
    if (-not $taskReady) { throw 'Disposable PostgreSQL did not become ready.' }

    & docker run --rm --name $taskTestRunner --network $taskTestRun `
        --mount "type=bind,source=$taskBackendPath,target=/workspace" `
        --mount type=volume,source=bugboard26-maven-cache,target=/root/.m2 `
        -e "BUGBOARD_TEST_DB_URL=jdbc:postgresql://${taskTestDb}:5432/bugboard_tests" `
        -e BUGBOARD_TEST_DB_USERNAME=bugboard_tests -e BUGBOARD_TEST_DB_PASSWORD=test-only-password `
        -w /workspace maven:3.9-eclipse-temurin-21 mvn -B -ntp test
    if ($LASTEXITCODE -ne 0) { throw 'Backend tests failed. See backend/target/surefire-reports.' }
} finally {
    # Only exact resource names generated for this run are removed.
    $taskRemainingRunner = & docker container ls -aq --filter "name=^/${taskTestRunner}$"
    if ($taskRemainingRunner) { & docker container rm -f $taskTestRunner | Out-Null }
    if ($taskDatabaseCreated) { & docker container rm -f $taskTestDb | Out-Null }
    if ($taskNetworkCreated) { & docker network rm $taskTestRun | Out-Null }
}
