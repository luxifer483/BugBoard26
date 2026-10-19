package com.bugboard26.backend.project;

import com.bugboard26.backend.common.ListResponse;
import com.bugboard26.backend.issue.IssueRepository;
import com.bugboard26.backend.issue.IssueStatus;
import com.bugboard26.backend.membership.ProjectMembership;
import com.bugboard26.backend.membership.ProjectMembershipRepository;
import com.bugboard26.backend.security.CurrentUser;
import com.bugboard26.backend.user.Role;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ProjectService {
    private final ProjectRepository projects;
    private final ProjectMembershipRepository memberships;
    private final CurrentUser currentUser;
    private final ProjectAccess access;
    private final IssueRepository issues;

    public ProjectService(ProjectRepository projects, ProjectMembershipRepository memberships,
                          CurrentUser currentUser, ProjectAccess access, IssueRepository issues) {
        this.projects = projects;
        this.memberships = memberships;
        this.currentUser = currentUser;
        this.access = access;
        this.issues = issues;
    }

    public ListResponse<ProjectResponse> list() {
        var user = currentUser.get();
        var visible = user.getRole() == Role.ADMIN ? projects.findAllByOrderByUpdatedAtDescIdDesc()
                : projects.findVisibleTo(user.getId());
        return ListResponse.of(visible.stream().map(this::response).toList());
    }

    public ProjectResponse get(Long id) { return response(access.requireAccess(id)); }

    @Transactional
    public ProjectResponse create(CreateProjectRequest request) {
        currentUser.requireAdmin();
        var project = projects.saveAndFlush(new Project(request.name().trim(), request.description().trim()));
        memberships.saveAndFlush(new ProjectMembership(project, currentUser.get()));
        return response(project);
    }

    private ProjectResponse response(Project project) {
        return ProjectResponse.from(project, memberships.countByProjectId(project.getId()),
                issues.countByProjectId(project.getId()),
                issues.countByProjectIdAndStatus(project.getId(), IssueStatus.OPEN),
                issues.countByProjectIdAndStatus(project.getId(), IssueStatus.CLOSED));
    }
}
