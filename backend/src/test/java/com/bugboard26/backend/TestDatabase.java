package com.bugboard26.backend;

import java.sql.DriverManager;
import java.time.Duration;
import org.junit.jupiter.api.extension.AfterAllCallback;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.testcontainers.containers.PostgreSQLContainer;

/** Isolated DB per test class, with an optional external test-only PostgreSQL server.
 * The external mode lets Maven run in a container without access to the Docker socket.
 */
final class TestDatabase implements AfterAllCallback {
    private final String schema;
    private PostgreSQLContainer<?> container;
    private String url, username, password;

    TestDatabase(String schema) { this.schema = schema; }

    private synchronized void start() {
        if (url != null) return;
        String external = System.getenv("BUGBOARD_TEST_DB_URL");
        if (external == null || external.isBlank()) {
            container = new PostgreSQLContainer<>("postgres:17-alpine")
                    .withStartupTimeout(Duration.ofMinutes(3));
            container.start();
            username = container.getUsername();
            password = container.getPassword();
            url = container.getJdbcUrl();
            return;
        }
        username = System.getenv("BUGBOARD_TEST_DB_USERNAME");
        password = System.getenv("BUGBOARD_TEST_DB_PASSWORD");
        if (username == null || password == null) {
            throw new IllegalStateException("External test DB requires BUGBOARD_TEST_DB_USERNAME and BUGBOARD_TEST_DB_PASSWORD.");
        }
        // Only the fixed schema name supplied by each test class enters this statement.
        if (!schema.matches("[a-z_]+")) throw new IllegalArgumentException("Invalid test schema");
        try (var connection = DriverManager.getConnection(external, username, password);
             var statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA " + schema);
        } catch (Exception exception) {
            throw new IllegalStateException("Use a fresh, disposable PostgreSQL database for each test run.", exception);
        }
        url = external + (external.contains("?") ? "&" : "?") + "currentSchema=" + schema;
    }

    String getJdbcUrl() { start(); return url; }
    String getUsername() { start(); return username; }
    String getPassword() { start(); return password; }

    @Override
    public void afterAll(ExtensionContext context) {
        if (container != null) container.stop();
    }
}
