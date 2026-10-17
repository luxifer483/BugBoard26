package com.bugboard26.backend;

import com.bugboard26.backend.auth.AuthService;
import com.bugboard26.backend.auth.LoginRequest;
import com.bugboard26.backend.membership.*;
import com.bugboard26.backend.project.*;
import com.bugboard26.backend.user.UserRepository;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
class PersistenceRestartTest {
    @Container
    static final PostgreSQLContainer<?> database = new PostgreSQLContainer<>("postgres:17-alpine")
            .withStartupTimeout(Duration.ofMinutes(3));

    @Test
    void usersProjectsMembershipsAndAdminCredentialsSurviveApplicationRestart() {
        Long projectId;
        Long adminId;
        try (var first = start()) {
            var admin = first.getBean(UserRepository.class).findByEmail("restart@example.test").orElseThrow();
            adminId = admin.getId();
            var project = first.getBean(ProjectRepository.class).saveAndFlush(new Project("Persistent project", "Survives restart"));
            projectId = project.getId();
            first.getBean(ProjectMembershipRepository.class).saveAndFlush(new ProjectMembership(project, admin));
        }
        try (var restarted = start()) {
            assertThat(restarted.getBean(UserRepository.class).count()).isEqualTo(1);
            assertThat(restarted.getBean(ProjectRepository.class).findById(projectId)).isPresent();
            assertThat(restarted.getBean(ProjectMembershipRepository.class).existsByProjectIdAndUserId(projectId, adminId)).isTrue();
            var login = restarted.getBean(AuthService.class).login(new LoginRequest("restart@example.test", "Restart123!"));
            assertThat(login.user().id()).isEqualTo(adminId);
        }
    }

    private ConfigurableApplicationContext start() {
        return new SpringApplicationBuilder(BugBoard26Application.class).run(
                "--spring.profiles.active=dev", "--server.port=0",
                "--spring.datasource.url=" + database.getJdbcUrl(),
                "--spring.datasource.username=" + database.getUsername(),
                "--spring.datasource.password=" + database.getPassword(),
                "--app.bootstrap.email=restart@example.test", "--app.bootstrap.password=Restart123!",
                "--app.jwt.secret=restart-test-secret-at-least-thirty-two-bytes");
    }
}
