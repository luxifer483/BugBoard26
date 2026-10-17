package com.bugboard26.backend.project;

import com.bugboard26.backend.common.ApiException;
import com.bugboard26.backend.membership.ProjectMembershipRepository;
import com.bugboard26.backend.security.CurrentUser;
import com.bugboard26.backend.user.Role;
import org.springframework.stereotype.Component;

@Component
public class ProjectAccess {
    private final ProjectRepository projects;
    private final ProjectMembershipRepository memberships;
    private final CurrentUser currentUser;

    public ProjectAccess(ProjectRepository projects, ProjectMembershipRepository memberships, CurrentUser currentUser) {
        this.projects = projects;
        this.memberships = memberships;
        this.currentUser = currentUser;
    }

    public Project requireAccess(Long projectId) {
        var project = projects.findById(projectId).orElseThrow(() -> ApiException.notFound("Project"));
        var user = currentUser.get();
        if (user.getRole() != Role.ADMIN && !memberships.existsByProjectIdAndUserId(projectId, user.getId())) {
            throw ApiException.forbidden();
        }
        return project;
    }
}
