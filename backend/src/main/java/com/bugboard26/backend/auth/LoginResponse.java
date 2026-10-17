package com.bugboard26.backend.auth;

import com.bugboard26.backend.user.UserResponse;
import java.time.Instant;

public record LoginResponse(String token, Instant expiresAt, UserResponse user) {}
