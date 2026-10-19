package com.bugboard26.backend.issue;

import jakarta.validation.constraints.NotNull;

public record UpdateIssueStatusRequest(@NotNull IssueStatus status) {}
