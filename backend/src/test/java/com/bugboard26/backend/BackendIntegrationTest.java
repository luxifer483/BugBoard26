package com.bugboard26.backend;

import com.bugboard26.backend.security.JwtProperties;
import com.bugboard26.backend.user.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.junit.jupiter.api.extension.RegisterExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "app.jwt.secret=test-only-secret-with-more-than-thirty-two-bytes")
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class BackendIntegrationTest {
    @RegisterExtension
    static final TestDatabase database = new TestDatabase("milestone_one");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", database::getJdbcUrl);
        properties.add("spring.datasource.username", database::getUsername);
        properties.add("spring.datasource.password", database::getPassword);
    }

    @Autowired MockMvc http;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired JwtEncoder encoder;
    @Autowired JwtProperties jwtProperties;
    private User admin;
    private User member;
    private String adminToken;
    private String memberToken;

    @BeforeEach
    void accounts() throws Exception {
        var suffix = UUID.randomUUID().toString();
        admin = users.saveAndFlush(new User("Administrator", "admin-" + suffix + "@example.test", passwords.encode("Password123!"), Role.ADMIN));
        member = users.saveAndFlush(new User("Member", "member-" + suffix + "@example.test", passwords.encode("Password123!"), Role.USER));
        adminToken = login(admin.getEmail(), "Password123!").get("token").asText();
        memberToken = login(member.getEmail(), "Password123!").get("token").asText();
    }

    @Test
    void loginNormalizesEmailAndReturnsSafeUser() throws Exception {
        http.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", admin.getEmail().toUpperCase(), "password", "Password123!"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.user.role").value("ADMIN"))
                .andExpect(jsonPath("$.token").isNotEmpty()).andExpect(jsonPath("$.expiresAt").exists())
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist()).andExpect(jsonPath("$.user.password").doesNotExist());
    }

    @Test
    void wrongPasswordAndUnknownEmailReturnSameFailure() throws Exception {
        for (String email : List.of(admin.getEmail(), "missing@example.test")) {
            http.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(Map.of("email", email, "password", "wrong-password"))))
                    .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
        }
    }

    @Test
    void multibytePasswordBeyondBcryptLimitDoesNotCauseServerError() throws Exception {
        http.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", admin.getEmail(), "password", "\u00e9".repeat(40)))))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void protectedRoutesRejectMissingAndTamperedTokens() throws Exception {
        http.perform(get("/api/projects")).andExpect(status().isUnauthorized());
        http.perform(get("/api/projects").header("Authorization", "Bearer " + adminToken + "invalid"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void expiredTokenIsRejected() throws Exception {
        var claims = JwtClaimsSet.builder().issuer(jwtProperties.issuer()).audience(List.of(jwtProperties.audience()))
                .subject(admin.getId().toString()).issuedAt(Instant.now().minusSeconds(7200))
                .expiresAt(Instant.now().minusSeconds(3600)).build();
        var expired = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        http.perform(get("/api/users/me").header("Authorization", "Bearer " + expired)).andExpect(status().isUnauthorized());
    }

    @Test
    void currentUserComesFromAuthenticatedIdentity() throws Exception {
        http.perform(get("/api/users/me").header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(member.getId()))
                .andExpect(jsonPath("$.role").value("USER"));
    }

    @Test
    void administratorCreatesUserWithHashedPasswordAndUniqueEmail() throws Exception {
        var email = "new-" + UUID.randomUUID() + "@example.test";
        var payload = Map.of("fullName", "New User", "email", email.toUpperCase(), "password", "Password123!", "role", "USER");
        http.perform(post("/api/users").header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
        var saved = users.findByEmail(email).orElseThrow();
        assertThat(saved.getPasswordHash()).isNotEqualTo("Password123!");
        assertThat(passwords.matches("Password123!", saved.getPasswordHash())).isTrue();
        http.perform(post("/api/users").header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("EMAIL_EXISTS"));
        login(email, "Password123!");
    }

    @Test
    void ordinaryUserCannotCreateUsersOrEnumerateAllAccounts() throws Exception {
        http.perform(get("/api/users").header("Authorization", "Bearer " + memberToken)).andExpect(status().isForbidden());
        http.perform(post("/api/users").header("Authorization", "Bearer " + memberToken)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "fullName", "Escalation", "email", "escalation@example.test", "password", "Password123!", "role", "ADMIN"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void invalidFieldsAndUnknownRolesAreRejected() throws Exception {
        http.perform(post("/api/users").header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"fullName\":\" \",\"email\":\"invalid\",\"password\":\"short\",\"role\":\"USER\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.email").exists());
        http.perform(post("/api/users").header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"fullName\":\"Name\",\"email\":\"valid@example.test\",\"password\":\"Password123!\",\"role\":\"QA\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void projectListsAndDirectAccessEnforceMembership() throws Exception {
        var first = createProject("Visible");
        var second = createProject("Private");
        addMember(first, member.getId());
        http.perform(get("/api/projects").header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalCount").value(1))
                .andExpect(jsonPath("$.items[0].id").value(first));
        http.perform(get("/api/projects/{id}", first).header("Authorization", "Bearer " + memberToken)).andExpect(status().isOk());
        http.perform(get("/api/projects/{id}", second).header("Authorization", "Bearer " + memberToken)).andExpect(status().isForbidden());
        http.perform(get("/api/projects/{id}/members", second).header("Authorization", "Bearer " + memberToken)).andExpect(status().isForbidden());
        http.perform(get("/api/projects/{id}", second).header("Authorization", "Bearer " + adminToken)).andExpect(status().isOk());
        http.perform(get("/api/projects").header("Authorization", "Bearer " + adminToken))
                .andExpect(jsonPath("$.items[*].id", hasItem((int) second)));
    }

    @Test
    void ordinaryUserCannotCreateProjectsOrChangeMembership() throws Exception {
        var project = createProject("Controlled");
        http.perform(post("/api/projects").header("Authorization", "Bearer " + memberToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Project\",\"description\":\"Description\"}"))
                .andExpect(status().isForbidden());
        http.perform(post("/api/projects/{id}/members", project).header("Authorization", "Bearer " + memberToken)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("userId", member.getId()))))
                .andExpect(status().isForbidden());
        http.perform(delete("/api/projects/{id}/members/{userId}", project, admin.getId())
                .header("Authorization", "Bearer " + memberToken)).andExpect(status().isForbidden());
    }

    @Test
    void membershipCannotBeDuplicatedAndRemovalRevokesAccessImmediately() throws Exception {
        var project = createProject("Membership");
        addMember(project, member.getId());
        http.perform(post("/api/projects/{id}/members", project).header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("userId", member.getId()))))
                .andExpect(status().isConflict());
        http.perform(get("/api/projects/{id}/members", project).header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalCount").value(2));
        http.perform(delete("/api/projects/{id}/members/{userId}", project, member.getId())
                .header("Authorization", "Bearer " + adminToken)).andExpect(status().isNoContent());
        http.perform(get("/api/projects/{id}", project).header("Authorization", "Bearer " + memberToken)).andExpect(status().isForbidden());
        http.perform(get("/api/projects").header("Authorization", "Bearer " + memberToken)).andExpect(jsonPath("$.totalCount").value(0));
    }

    @Test
    void malformedIdentifiersAndMissingResourcesAreHandled() throws Exception {
        http.perform(get("/api/projects/not-a-number").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        http.perform(get("/api/projects/9223372036854775807").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void corsAllowsOnlyConfiguredFrontendOrigins() throws Exception {
        http.perform(options("/api/projects").header("Origin", "http://localhost:5173")
                .header("Access-Control-Request-Method", "GET").header("Access-Control-Request-Headers", "authorization"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
        http.perform(options("/api/projects").header("Origin", "https://untrusted.example")
                .header("Access-Control-Request-Method", "GET")).andExpect(status().isForbidden());
    }

    private JsonNode login(String email, String password) throws Exception {
        var result = http.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "password", password))))
                .andExpect(status().isOk()).andReturn();
        return json.readTree(result.getResponse().getContentAsString());
    }

    private long createProject(String name) throws Exception {
        var result = http.perform(post("/api/projects").header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("name", name, "description", "Test project"))))
                .andExpect(status().isCreated()).andReturn();
        return json.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private void addMember(long project, long user) throws Exception {
        http.perform(post("/api/projects/{id}/members", project).header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("userId", user))))
                .andExpect(status().isCreated());
    }
}
