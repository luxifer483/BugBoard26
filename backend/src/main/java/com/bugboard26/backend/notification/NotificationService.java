package com.bugboard26.backend.notification;

import com.bugboard26.backend.common.ApiException;
import com.bugboard26.backend.issue.Issue;
import com.bugboard26.backend.membership.ProjectMembershipRepository;
import com.bugboard26.backend.project.ProjectAccess;
import com.bugboard26.backend.security.CurrentUser;
import com.bugboard26.backend.user.*;
import java.util.LinkedHashMap;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
@Transactional(readOnly = true)
public class NotificationService {
    private final NotificationRepository notifications;
    private final CurrentUser currentUser;
    private final ProjectMembershipRepository memberships;
    private final ProjectAccess projects;

    public NotificationService(NotificationRepository notifications, CurrentUser currentUser,
                               ProjectMembershipRepository memberships, ProjectAccess projects) {
        this.notifications = notifications;
        this.currentUser = currentUser;
        this.memberships = memberships;
        this.projects = projects;
    }

    public NotificationListResponse list() {
        var user = currentUser.get();
        var items = notifications.findVisibleTo(user.getId(), user.getRole() == Role.ADMIN)
                .stream().map(NotificationResponse::from).toList();
        return new NotificationListResponse(items, items.size(), items.stream().filter(n -> !n.read()).count());
    }

    @Transactional
    public NotificationResponse markRead(Long id) {
        var notification = notifications.findByIdAndRecipientId(id, currentUser.get().getId())
                .orElseThrow(() -> ApiException.notFound("Notification"));
        projects.requireAccess(notification.getIssue().getProject().getId());
        notification.markRead();
        return NotificationResponse.from(notification);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void assigned(Issue issue) {
        notify(issue, "Issue " + issue.getCode() + " has been assigned to you", issue.getAssignee());
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void commented(Issue issue) {
        notify(issue, "New comment on " + issue.getCode(), issue.getReporter(), issue.getAssignee());
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void statusChanged(Issue issue) {
        notify(issue, "Issue " + issue.getCode() + " status changed to " + issue.getStatus(),
                issue.getReporter(), issue.getAssignee());
    }

    private void notify(Issue issue, String message, User... candidates) {
        var recipients = new LinkedHashMap<Long, User>();
        var actor = currentUser.get().getId();
        for (var user : candidates) {
            if (user != null && !user.getId().equals(actor)
                    && (user.getRole() == Role.ADMIN
                    || memberships.existsByProjectIdAndUserId(issue.getProject().getId(), user.getId()))) {
                recipients.put(user.getId(), user);
            }
        }
        recipients.values().forEach(user -> notifications.save(new Notification(user, issue, message)));
    }
}
