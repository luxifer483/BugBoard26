package com.bugboard26.backend.issue;

import jakarta.validation.constraints.*;

public record CreateIssueRequest(@NotNull @Positive Long projectId,
                                 @NotBlank @Size(max = 200) String title,
                                 @NotBlank @Size(max = 10000) String description,
                                 @NotNull IssueType type, @NotNull IssuePriority priority,
                                 @Positive Long assigneeId) {}
