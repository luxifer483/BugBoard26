package com.bugboard26.backend.comment;

import jakarta.validation.constraints.*;

public record CreateCommentRequest(@NotBlank @Size(max = 5000) String content) {}
