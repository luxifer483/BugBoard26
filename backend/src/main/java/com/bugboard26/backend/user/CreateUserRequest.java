package com.bugboard26.backend.user;

import jakarta.validation.constraints.*;

public record CreateUserRequest(
        @NotBlank @Size(max = 120) String fullName,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotNull Role role) {}
