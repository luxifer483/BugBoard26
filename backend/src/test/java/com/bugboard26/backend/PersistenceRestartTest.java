package com.bugboard26.backend;

import com.bugboard26.backend.auth.AuthService;
import com.bugboard26.backend.auth.LoginRequest;
import com.bugboard26.backend.membership.*;
import com.bugboard26.backend.project.*;
import com.bugboard26.backend.user.UserRepository;
import com.bugboard26.backend.issue.*;
import com.bugboard26.backend.comment.*;
import com.bugboard26.backend.notification.*;
import java.nio.charset.StandardCharsets;
import java.sql.DriverManager;
import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.core.io.*;
import org.springframework.jdbc.datasource.init.ScriptUtils;

import static org.assertj.core.api.Assertions.assertThat;

class PersistenceRestartTest {
    @RegisterExtension
    static final TestDatabase database = new TestDatabase("persistence_restart");

    @Test
    void milestoneOneUpgradeAndAllEntitiesSurviveApplicationRestart() throws Exception {
        // Reproduce an existing milestone-1 database before the new app initializes its schema.
        var schema = new ClassPathResource("db/schema.sql").getContentAsString(StandardCharsets.UTF_8);
        try (var connection = DriverManager.getConnection(database.getJdbcUrl(), database.getUsername(), database.getPassword())) {
            ScriptUtils.executeSqlScript(connection, new ByteArrayResource(
                    schema.split("-- Milestone 2:")[0].getBytes(StandardCharsets.UTF_8)));
            try (var statement = connection.createStatement()) {
                statement.executeUpdate("INSERT INTO projects(name, description, status, created_at, updated_at) "
                        + "VALUES ('Existing milestone 1', 'Preserved on upgrade', 'ACTIVE', now(), now())");
            }
        }
        Long projectId;
        Long adminId;
        Long issueId;
        Long notificationId;
        try (var first = start()) {
            var admin = first.getBean(UserRepository.class).findByEmail("restart@example.test").orElseThrow();
            adminId = admin.getId();
            var project = first.getBean(ProjectRepository.class).saveAndFlush(new Project("Persistent project", "Survives restart"));
            projectId = project.getId();
            first.getBean(ProjectMembershipRepository.class).saveAndFlush(new ProjectMembership(project, admin));
            var issue = first.getBean(IssueRepository.class).saveAndFlush(new Issue(project, admin, admin,
                    "Persistent issue", "Survives restart", IssueType.BUG, IssuePriority.HIGH));
            issueId = issue.getId();
            first.getBean(CommentRepository.class).saveAndFlush(new IssueComment(issue, admin, "Persistent comment"));
            var notification = new Notification(admin, issue, "Persistent notification");
            notification.markRead();
            notificationId = first.getBean(NotificationRepository.class).saveAndFlush(notification).getId();
        }
        try (var restarted = start()) {
            assertThat(restarted.getBean(UserRepository.class).count()).isEqualTo(1);
            assertThat(restarted.getBean(ProjectRepository.class).findById(projectId)).isPresent();
            assertThat(restarted.getBean(ProjectRepository.class).count()).isEqualTo(2);
            assertThat(restarted.getBean(ProjectMembershipRepository.class).existsByProjectIdAndUserId(projectId, adminId)).isTrue();
            var login = restarted.getBean(AuthService.class).login(new LoginRequest("restart@example.test", "Restart123!"));
            assertThat(login.user().id()).isEqualTo(adminId);
            assertThat(restarted.getBean(IssueRepository.class).findById(issueId).orElseThrow().getTitle())
                    .isEqualTo("Persistent issue");
            assertThat(restarted.getBean(CommentRepository.class).findAllByIssueIdOrderByCreatedAtAscIdAsc(issueId))
                    .extracting(IssueComment::getContent).containsExactly("Persistent comment");
            assertThat(restarted.getBean(NotificationRepository.class).findById(notificationId).orElseThrow().isRead()).isTrue();
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
