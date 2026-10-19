package com.bugboard26.backend.comment;

import com.bugboard26.backend.user.UserResponse;
import java.time.Instant;

public record CommentResponse(Long id, Long issueId, String content, UserResponse author, Instant createdAt) {
    public static CommentResponse from(IssueComment comment) {
        return new CommentResponse(comment.getId(), comment.getIssue().getId(), comment.getContent(),
                UserResponse.from(comment.getAuthor()), comment.getCreatedAt());
    }
}
