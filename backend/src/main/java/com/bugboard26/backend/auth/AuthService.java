package com.bugboard26.backend.auth;

import com.bugboard26.backend.common.ApiException;
import com.bugboard26.backend.security.JwtProperties;
import com.bugboard26.backend.user.UserRepository;
import com.bugboard26.backend.user.UserResponse;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final JwtEncoder encoder;
    private final JwtProperties properties;
    private final String dummyHash;

    public AuthService(UserRepository users, PasswordEncoder passwords, JwtEncoder encoder, JwtProperties properties) {
        this.users = users;
        this.passwords = passwords;
        this.encoder = encoder;
        this.properties = properties;
        this.dummyHash = passwords.encode("unused-login-timing-placeholder");
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        var user = users.findByEmail(request.email().trim().toLowerCase(Locale.ROOT)).orElse(null);
        boolean validLength = request.password().getBytes(StandardCharsets.UTF_8).length <= 72;
        boolean matches = passwords.matches(validLength ? request.password() : "invalid-length-placeholder",
                user == null ? dummyHash : user.getPasswordHash());
        if (!validLength || user == null || !matches) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid email or password.");
        }
        var now = Instant.now();
        var expiresAt = now.plusSeconds(properties.ttlSeconds());
        var claims = JwtClaimsSet.builder().issuer(properties.issuer()).audience(List.of(properties.audience()))
                .subject(user.getId().toString()).issuedAt(now).expiresAt(expiresAt).build();
        var token = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims));
        return new LoginResponse(token.getTokenValue(), expiresAt, UserResponse.from(user));
    }
}
