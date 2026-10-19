package com.bugboard26.backend.comment;

import com.bugboard26.backend.common.ListResponse;
import com.bugboard26.backend.issue.IssueAccess;
import com.bugboard26.backend.notification.NotificationService;
import com.bugboard26.backend.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CommentService {
    private final CommentRepository comments;
    private final IssueAccess issues;
    private final CurrentUser currentUser;
    private final NotificationService notifications;

    public CommentService(CommentRepository comments, IssueAccess issues,
                          CurrentUser currentUser, NotificationService notifications) {
        this.comments = comments;
        this.issues = issues;
        this.currentUser = currentUser;
        this.notifications = notifications;
    }

    public ListResponse<CommentResponse> list(Long issueId) {
        issues.requireAccess(issueId);
        return ListResponse.of(comments.findAllByIssueIdOrderByCreatedAtAscIdAsc(issueId)
                .stream().map(CommentResponse::from).toList());
    }

    @Transactional
    public CommentResponse create(Long issueId, CreateCommentRequest request) {
        var issue = issues.requireForUpdate(issueId);
        var comment = comments.saveAndFlush(new IssueComment(issue, currentUser.get(), request.content().trim()));
        issue.touch();
        notifications.commented(issue);
        return CommentResponse.from(comment);
    }
}
