package com.bugboard26.backend.issue;

import com.bugboard26.backend.common.*;
import com.bugboard26.backend.membership.ProjectMembershipRepository;
import com.bugboard26.backend.notification.NotificationService;
import com.bugboard26.backend.project.ProjectAccess;
import com.bugboard26.backend.security.CurrentUser;
import com.bugboard26.backend.user.*;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class IssueService {
    private final IssueRepository issues;
    private final ProjectAccess projects;
    private final IssueAccess access;
    private final CurrentUser currentUser;
    private final UserRepository users;
    private final ProjectMembershipRepository memberships;
    private final NotificationService notifications;

    public IssueService(IssueRepository issues, ProjectAccess projects, IssueAccess access,
                        CurrentUser currentUser, UserRepository users,
                        ProjectMembershipRepository memberships, NotificationService notifications) {
        this.issues = issues;
        this.projects = projects;
        this.access = access;
        this.currentUser = currentUser;
        this.users = users;
        this.memberships = memberships;
        this.notifications = notifications;
    }

    public ListResponse<IssueResponse> list(Long projectId) {
        if (projectId != null) {
            projects.requireAccess(projectId);
            return ListResponse.of(issues.findAllByProjectIdOrderByUpdatedAtDescIdDesc(projectId)
                    .stream().map(IssueResponse::from).toList());
        }
        var user = currentUser.get();
        var visible = user.getRole() == Role.ADMIN ? issues.findAllByOrderByUpdatedAtDescIdDesc()
                : issues.findVisibleTo(user.getId());
        return ListResponse.of(visible.stream().map(IssueResponse::from).toList());
    }

    public IssueResponse get(Long id) { return IssueResponse.from(access.requireAccess(id)); }

    @Transactional
    public IssueResponse create(CreateIssueRequest request) {
        var project = projects.requireAccess(request.projectId());
        var issue = issues.saveAndFlush(new Issue(project, currentUser.get(),
                assignee(project.getId(), request.assigneeId()), request.title().trim(),
                request.description().trim(), request.type(), request.priority()));
        project.touch();
        notifications.assigned(issue);
        return IssueResponse.from(issue);
    }

    @Transactional
    public IssueResponse updateStatus(Long id, UpdateIssueStatusRequest request) {
        var issue = access.requireForUpdate(id);
        if (issue.getStatus() == request.status()) return IssueResponse.from(issue);
        if (!(issue.getStatus() == IssueStatus.OPEN && request.status() == IssueStatus.IN_PROGRESS)
                && !(issue.getStatus() == IssueStatus.IN_PROGRESS && request.status() == IssueStatus.CLOSED)) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_STATUS_TRANSITION",
                    "Move an issue from OPEN to IN_PROGRESS, then to CLOSED.");
        }
        issue.setStatus(request.status());
        notifications.statusChanged(issue);
        return IssueResponse.from(issue);
    }

    @Transactional
    public IssueResponse assign(Long id, AssignIssueRequest request) {
        var issue = access.requireForUpdate(id);
        var next = assignee(issue.getProject().getId(), request.assigneeId());
        if (Objects.equals(issue.getAssignee() == null ? null : issue.getAssignee().getId(), request.assigneeId())) {
            return IssueResponse.from(issue);
        }
        issue.setAssignee(next);
        notifications.assigned(issue);
        return IssueResponse.from(issue);
    }

    private User assignee(Long projectId, Long userId) {
        if (userId == null) return null;
        var user = users.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        if (!memberships.existsByProjectIdAndUserId(projectId, userId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "ASSIGNEE_NOT_MEMBER",
                    "The assignee must belong to the issue's project.");
        }
        return user;
    }
}
