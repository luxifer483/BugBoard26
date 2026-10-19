package com.bugboard26.backend.notification;

import com.bugboard26.backend.issue.Issue;
import com.bugboard26.backend.user.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "notifications")
public class Notification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "issue_id", nullable = false)
    private Issue issue;
    @Column(nullable = false, length = 500)
    private String message;
    @Column(nullable = false)
    private boolean read;
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected Notification() {}
    public Notification(User recipient, Issue issue, String message) {
        this.recipient = recipient;
        this.issue = issue;
        this.message = message;
        this.createdAt = Instant.now();
    }
    public void markRead() { read = true; }
    public Long getId() { return id; }
    public Issue getIssue() { return issue; }
    public String getMessage() { return message; }
    public boolean isRead() { return read; }
    public Instant getCreatedAt() { return createdAt; }
}
