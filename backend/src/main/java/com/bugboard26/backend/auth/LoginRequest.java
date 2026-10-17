package com.bugboard26.backend.auth;

import jakarta.validation.constraints.*;

public record LoginRequest(@NotBlank @Email @Size(max = 254) String email,
                           @NotBlank @Size(max = 72) String password) {}
