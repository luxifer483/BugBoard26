package com.bugboard26.backend.issue;

import jakarta.validation.constraints.Positive;

// null removes the current assignment.
public record AssignIssueRequest(@Positive Long assigneeId) {}
