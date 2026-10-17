package com.bugboard26.backend.user;

import com.bugboard26.backend.common.ApiException;
import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpStatus;

public final class PasswordPolicy {
    private PasswordPolicy() {}

    public static void validate(String password) {
        if (password == null || password.isBlank() || password.length() < 8
                || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PASSWORD",
                    "Password must contain at least 8 characters and at most 72 UTF-8 bytes.");
        }
    }
}
