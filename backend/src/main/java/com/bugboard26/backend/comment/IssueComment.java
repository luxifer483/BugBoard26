package com.bugboard26.backend.comment;

import com.bugboard26.backend.issue.Issue;
import com.bugboard26.backend.user.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "issue_comments")
public class IssueComment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "issue_id", nullable = false)
    private Issue issue;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "author_id", nullable = false)
    private User author;
    @Column(nullable = false, length = 5000)
    private String content;
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected IssueComment() {}
    public IssueComment(Issue issue, User author, String content) {
        this.issue = issue;
        this.author = author;
        this.content = content;
        this.createdAt = Instant.now();
    }
    public Long getId() { return id; }
    public Issue getIssue() { return issue; }
    public User getAuthor() { return author; }
    public String getContent() { return content; }
    public Instant getCreatedAt() { return createdAt; }
}
