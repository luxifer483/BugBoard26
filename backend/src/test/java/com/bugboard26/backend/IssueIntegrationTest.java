package com.bugboard26.backend;

import com.bugboard26.backend.comment.CommentRepository;
import com.bugboard26.backend.issue.*;
import com.bugboard26.backend.membership.*;
import com.bugboard26.backend.notification.NotificationRepository;
import com.bugboard26.backend.project.*;
import com.bugboard26.backend.user.*;
import com.fasterxml.jackson.databind.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.*;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;
import org.junit.jupiter.api.extension.RegisterExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "app.jwt.secret=issue-test-secret-with-more-than-thirty-two-bytes")
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class IssueIntegrationTest {
    @RegisterExtension
    static final TestDatabase database = new TestDatabase("milestone_two");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", database::getJdbcUrl);
        properties.add("spring.datasource.username", database::getUsername);
        properties.add("spring.datasource.password", database::getPassword);
    }

    @Autowired MockMvc http;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired ProjectRepository projects;
    @Autowired ProjectMembershipRepository memberships;
    @Autowired IssueRepository issues;
    @Autowired CommentRepository comments;
    @Autowired NotificationRepository notifications;
    private User admin, member, reviewer, outsider;
    private Long projectId;

    @BeforeEach
    void fixture() {
        admin = account(Role.ADMIN);
        member = account(Role.USER);
        reviewer = account(Role.USER);
        outsider = account(Role.USER);
        var project = projects.saveAndFlush(new Project("Issues", "Milestone 2"));
        projectId = project.getId();
        memberships.saveAndFlush(new ProjectMembership(project, member));
        memberships.saveAndFlush(new ProjectMembership(project, reviewer));
        // The administrator deliberately has no membership: global access still applies.
    }

    @Test
    void memberCreatesIssueAndServerOwnsReporterStatusAndTimestamps() throws Exception {
        var payload = payload(member.getId());
        payload.put("reporter", Map.of("id", admin.getId()));
        payload.put("status", "CLOSED");
        payload.put("createdAt", "2000-01-01T00:00:00Z");
        var created = body(call(member, "POST", "/api/issues", payload).andExpect(status().isCreated())
                .andExpect(jsonPath("$.reporter.id").value(member.getId()))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.assignee.id").value(member.getId()))
                .andExpect(jsonPath("$.reporter.passwordHash").doesNotExist()));
        assertThat(created.get("code").asText()).isEqualTo("BUG-26-" + created.get("id").asLong());
        assertThat(created.get("createdAt").asText()).doesNotStartWith("2000");
        call(member, "GET", "/api/notifications", null).andExpect(jsonPath("$.unreadCount").value(0));
        call(admin, "GET", "/api/issues/" + created.get("id"), null).andExpect(status().isOk());
    }

    @Test
    void invalidFieldsAndEnumsAreRejectedWithoutPersistingAnything() throws Exception {
        var before = issues.count();
        for (var field : List.of("title", "description", "type", "priority", "projectId")) {
            var invalid = payload(null);
            invalid.put(field, switch (field) {
                case "title" -> " ";
                case "description" -> "x".repeat(10001);
                case "projectId" -> -1;
                default -> "UNKNOWN";
            });
            call(member, "POST", "/api/issues", invalid).andExpect(status().isBadRequest());
        }
        var missing = payload(null);
        missing.remove("type");
        call(member, "POST", "/api/issues", missing).andExpect(status().isBadRequest());
        assertThat(issues.count()).isEqualTo(before);
    }

    @Test
    void assignmentRequiresMembershipEvenForAnAdministrator() throws Exception {
        for (var invalidAssignee : List.of(outsider.getId(), admin.getId())) {
            call(member, "POST", "/api/issues", payload(invalidAssignee))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("ASSIGNEE_NOT_MEMBER"));
        }
        call(member, "POST", "/api/issues", payload(Long.MAX_VALUE)).andExpect(status().isNotFound());
        long id = create(admin, member.getId());
        call(reviewer, "PATCH", "/api/issues/" + id + "/assignee", Map.of("assigneeId", outsider.getId()))
                .andExpect(status().isBadRequest());
        call(member, "GET", "/api/issues/" + id, null).andExpect(jsonPath("$.assignee.id").value(member.getId()));
    }

    @Test
    void projectAndDirectIssueEndpointsRejectOutsiders() throws Exception {
        long id = create(admin, member.getId());
        for (String path : List.of("/api/projects/" + projectId + "/issues", "/api/issues/" + id,
                "/api/issues/" + id + "/comments")) {
            call(outsider, "GET", path, null).andExpect(status().isForbidden());
        }
        call(outsider, "POST", "/api/issues", payload(null)).andExpect(status().isForbidden());
        call(outsider, "POST", "/api/issues/" + id + "/comments", Map.of("content", "intrusion"))
                .andExpect(status().isForbidden());
        call(outsider, "PATCH", "/api/issues/" + id + "/status", Map.of("status", "IN_PROGRESS"))
                .andExpect(status().isForbidden());
        call(outsider, "PATCH", "/api/issues/" + id + "/assignee", Map.of("assigneeId", member.getId()))
                .andExpect(status().isForbidden());
        call(outsider, "GET", "/api/issues", null).andExpect(jsonPath("$.totalCount").value(0));
        call(member, "GET", "/api/issues", null).andExpect(jsonPath("$.totalCount").value(1));
        call(admin, "GET", "/api/issues/" + id, null).andExpect(status().isOk());
    }

    @Test
    void issueLifecycleIsForwardOnlyAndSameStateIsIdempotent() throws Exception {
        long id = create(admin, member.getId());
        call(member, "PATCH", "/api/issues/" + id + "/status", Map.of("status", "CLOSED"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("INVALID_STATUS_TRANSITION"));
        for (String next : List.of("IN_PROGRESS", "IN_PROGRESS", "CLOSED", "CLOSED")) {
            call(member, "PATCH", "/api/issues/" + id + "/status", Map.of("status", next))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.status").value(next));
        }
        call(member, "PATCH", "/api/issues/" + id + "/status", Map.of("status", "OPEN"))
                .andExpect(status().isConflict());
        call(admin, "GET", "/api/notifications", null).andExpect(jsonPath("$.unreadCount").value(2));
        call(member, "GET", "/api/notifications", null).andExpect(jsonPath("$.unreadCount").value(1));
    }

    @Test
    void reassignmentAndUnassignmentPersistWithoutDuplicateNotifications() throws Exception {
        long id = create(admin, null);
        for (int i = 0; i < 2; i++) {
            call(member, "PATCH", "/api/issues/" + id + "/assignee", Map.of("assigneeId", reviewer.getId()))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.assignee.id").value(reviewer.getId()));
        }
        call(reviewer, "GET", "/api/notifications", null).andExpect(jsonPath("$.unreadCount").value(1));
        var unassigned = new HashMap<String, Object>();
        unassigned.put("assigneeId", null);
        call(member, "PATCH", "/api/issues/" + id + "/assignee", unassigned)
                .andExpect(status().isOk()).andExpect(jsonPath("$.assignee").isEmpty());
        call(admin, "GET", "/api/issues/" + id, null).andExpect(jsonPath("$.assignee").isEmpty());
    }

    @Test
    void commentsUseAuthenticatedAuthorAreOrderedAndRejectInvalidContent() throws Exception {
        long id = create(admin, member.getId());
        call(reviewer, "POST", "/api/issues/" + id + "/comments", Map.of(
                        "content", " First comment ", "author", Map.of("id", admin.getId())))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.content").value("First comment"))
                .andExpect(jsonPath("$.author.id").value(reviewer.getId()));
        call(member, "POST", "/api/issues/" + id + "/comments", Map.of("content", "Second comment"))
                .andExpect(status().isCreated());
        for (String content : List.of(" ", "x".repeat(5001))) {
            call(member, "POST", "/api/issues/" + id + "/comments", Map.of("content", content))
                    .andExpect(status().isBadRequest());
        }
        call(member, "GET", "/api/issues/" + id + "/comments", null)
                .andExpect(jsonPath("$.totalCount").value(2))
                .andExpect(jsonPath("$.items[0].content").value("First comment"))
                .andExpect(jsonPath("$.items[1].content").value("Second comment"));
        call(member, "GET", "/api/notifications", null).andExpect(jsonPath("$.unreadCount").value(2));
        call(admin, "GET", "/api/notifications", null).andExpect(jsonPath("$.unreadCount").value(2));
    }

    @Test
    void reporterAndAssigneeReceiveOnlyOneNotificationWhenTheyAreTheSamePerson() throws Exception {
        long id = create(member, member.getId());
        call(reviewer, "POST", "/api/issues/" + id + "/comments", Map.of("content", "Please review"))
                .andExpect(status().isCreated());
        call(member, "GET", "/api/notifications", null).andExpect(jsonPath("$.totalCount").value(1));
        call(reviewer, "GET", "/api/notifications", null).andExpect(jsonPath("$.totalCount").value(0));
    }

    @Test
    void notificationsArePrivateAndMarkingReadIsPersistentAndIdempotent() throws Exception {
        create(admin, member.getId());
        var list = body(call(member, "GET", "/api/notifications", null).andExpect(status().isOk()));
        var id = list.get("items").get(0).get("id").asLong();
        call(admin, "PATCH", "/api/notifications/" + id + "/read", null).andExpect(status().isNotFound());
        call(outsider, "PATCH", "/api/notifications/" + id + "/read", null).andExpect(status().isNotFound());
        for (int i = 0; i < 2; i++) {
            call(member, "PATCH", "/api/notifications/" + id + "/read", null)
                    .andExpect(status().isOk()).andExpect(jsonPath("$.read").value(true));
        }
        call(member, "GET", "/api/notifications", null)
                .andExpect(jsonPath("$.unreadCount").value(0)).andExpect(jsonPath("$.items[0].read").value(true));
    }

    @Test
    void membershipRemovalRevokesIssuesCommentsAndNotificationVisibility() throws Exception {
        long id = create(admin, member.getId());
        long notification = body(call(member, "GET", "/api/notifications", null))
                .get("items").get(0).get("id").asLong();
        call(admin, "DELETE", "/api/projects/" + projectId + "/members/" + member.getId(), null)
                .andExpect(status().isNoContent());
        call(member, "GET", "/api/issues/" + id, null).andExpect(status().isForbidden());
        call(member, "GET", "/api/issues/" + id + "/comments", null).andExpect(status().isForbidden());
        call(member, "POST", "/api/issues/" + id + "/comments", Map.of("content", "revoked"))
                .andExpect(status().isForbidden());
        call(member, "PATCH", "/api/issues/" + id + "/status", Map.of("status", "IN_PROGRESS"))
                .andExpect(status().isForbidden());
        call(member, "GET", "/api/issues", null).andExpect(jsonPath("$.totalCount").value(0));
        call(member, "GET", "/api/notifications", null).andExpect(jsonPath("$.totalCount").value(0));
        call(member, "PATCH", "/api/notifications/" + notification + "/read", null).andExpect(status().isForbidden());
        call(reviewer, "POST", "/api/issues/" + id + "/comments", Map.of("content", "after revocation"))
                .andExpect(status().isCreated());
        call(member, "GET", "/api/notifications", null).andExpect(jsonPath("$.totalCount").value(0));
    }

    @Test
    void projectStatisticsReflectPersistedIssueStates() throws Exception {
        long id = create(admin, null);
        create(member, null);
        call(admin, "GET", "/api/projects/" + projectId, null)
                .andExpect(jsonPath("$.totalIssues").value(2)).andExpect(jsonPath("$.openIssues").value(2));
        call(member, "PATCH", "/api/issues/" + id + "/status", Map.of("status", "IN_PROGRESS"))
                .andExpect(status().isOk());
        call(member, "PATCH", "/api/issues/" + id + "/status", Map.of("status", "CLOSED"))
                .andExpect(status().isOk());
        call(member, "GET", "/api/projects/" + projectId, null)
                .andExpect(jsonPath("$.totalIssues").value(2)).andExpect(jsonPath("$.openIssues").value(1))
                .andExpect(jsonPath("$.closedIssues").value(1));
    }

    @Test
    void concurrentSameStateChangesEmitOneEvent() throws Exception {
        long id = create(admin, member.getId());
        var executor = Executors.newFixedThreadPool(2);
        try {
            var gate = new CountDownLatch(1);
            Callable<Integer> change = () -> {
                gate.await();
                return call(reviewer, "PATCH", "/api/issues/" + id + "/status", Map.of("status", "IN_PROGRESS"))
                        .andReturn().getResponse().getStatus();
            };
            var first = executor.submit(change);
            var second = executor.submit(change);
            gate.countDown();
            assertThat(first.get(20, TimeUnit.SECONDS)).isEqualTo(200);
            assertThat(second.get(20, TimeUnit.SECONDS)).isEqualTo(200);
        } finally {
            executor.shutdownNow();
        }
        call(member, "GET", "/api/notifications", null).andExpect(jsonPath("$.totalCount").value(2));
        call(admin, "GET", "/api/notifications", null).andExpect(jsonPath("$.totalCount").value(1));
    }

    @Test
    void newEndpointsRejectMissingAuthenticationAndHandleMissingResources() throws Exception {
        for (String path : List.of("/api/issues", "/api/issues/1", "/api/issues/1/comments", "/api/notifications")) {
            http.perform(get(path)).andExpect(status().isUnauthorized());
        }
        call(member, "GET", "/api/issues/" + Long.MAX_VALUE, null).andExpect(status().isNotFound());
        call(member, "GET", "/api/issues/invalid", null).andExpect(status().isBadRequest());
        call(member, "POST", "/api/issues/" + Long.MAX_VALUE + "/comments", Map.of("content", "missing"))
                .andExpect(status().isNotFound());
        call(member, "PATCH", "/api/notifications/" + Long.MAX_VALUE + "/read", null).andExpect(status().isNotFound());
    }

    private User account(Role role) {
        return users.saveAndFlush(new User(role.name(), UUID.randomUUID() + "@example.test", "unused", role));
    }

    private Map<String, Object> payload(Long assigneeId) {
        var payload = new HashMap<String, Object>();
        payload.put("projectId", projectId);
        payload.put("title", "Test issue");
        payload.put("description", "Description");
        payload.put("type", "BUG");
        payload.put("priority", "HIGH");
        payload.put("assigneeId", assigneeId);
        return payload;
    }

    private long create(User actor, Long assigneeId) throws Exception {
        return body(call(actor, "POST", "/api/issues", payload(assigneeId)).andExpect(status().isCreated())).get("id").asLong();
    }

    private ResultActions call(User actor, String method, String path, Object payload) throws Exception {
        var request = request(HttpMethod.valueOf(method), path)
                .with(jwt().jwt(token -> token.subject(actor.getId().toString())));
        if (payload != null) request.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload));
        return http.perform(request);
    }

    private JsonNode body(ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsString());
    }
}
