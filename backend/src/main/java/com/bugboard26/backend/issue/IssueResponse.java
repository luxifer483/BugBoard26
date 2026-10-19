package com.bugboard26.backend.issue;

import com.bugboard26.backend.user.UserResponse;
import java.time.Instant;

public record IssueResponse(Long id, String code, String title, String description,
                            IssueType type, IssuePriority priority, IssueStatus status,
                            ProjectSummary project, UserResponse reporter, UserResponse assignee,
                            Instant createdAt, Instant updatedAt) {
    public record ProjectSummary(Long id, String name) {}

    public static IssueResponse from(Issue issue) {
        return new IssueResponse(issue.getId(), issue.getCode(), issue.getTitle(), issue.getDescription(),
                issue.getType(), issue.getPriority(), issue.getStatus(),
                new ProjectSummary(issue.getProject().getId(), issue.getProject().getName()),
                UserResponse.from(issue.getReporter()),
                issue.getAssignee() == null ? null : UserResponse.from(issue.getAssignee()),
                issue.getCreatedAt(), issue.getUpdatedAt());
    }
}
