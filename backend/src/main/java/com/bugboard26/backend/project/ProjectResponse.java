package com.bugboard26.backend.project;

import java.time.Instant;

public record ProjectResponse(Long id, String name, String description, ProjectStatus status,
                              long memberCount, long totalIssues, long openIssues, long closedIssues,
                              Instant createdAt, Instant updatedAt) {
    public static ProjectResponse from(Project project, long memberCount, long totalIssues, long openIssues, long closedIssues) {
        return new ProjectResponse(project.getId(), project.getName(), project.getDescription(),
                project.getStatus(), memberCount, totalIssues, openIssues, closedIssues,
                project.getCreatedAt(), project.getUpdatedAt());
    }
}
