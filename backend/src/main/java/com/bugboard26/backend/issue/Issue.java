package com.bugboard26.backend.issue;

import com.bugboard26.backend.project.Project;
import com.bugboard26.backend.user.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "issues")
public class Issue {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "project_id", nullable = false)
    private Project project;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "assignee_id")
    private User assignee;
    @Column(nullable = false, length = 200)
    private String title;
    @Column(nullable = false, length = 10000)
    private String description;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private IssueType type;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private IssuePriority priority;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private IssueStatus status;
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
    @Column(nullable = false)
    private Instant updatedAt;

    protected Issue() {}

    public Issue(Project project, User reporter, User assignee, String title, String description,
                 IssueType type, IssuePriority priority) {
        this.project = project;
        this.reporter = reporter;
        this.assignee = assignee;
        this.title = title;
        this.description = description;
        this.type = type;
        this.priority = priority;
        this.status = IssueStatus.OPEN;
        this.createdAt = Instant.now();
        this.updatedAt = createdAt;
    }

    public void touch() { updatedAt = Instant.now(); project.touch(); }
    public void setStatus(IssueStatus status) { this.status = status; touch(); }
    public void setAssignee(User assignee) { this.assignee = assignee; touch(); }
    public Long getId() { return id; }
    public String getCode() { return "BUG-26-" + id; }
    public Project getProject() { return project; }
    public User getReporter() { return reporter; }
    public User getAssignee() { return assignee; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public IssueType getType() { return type; }
    public IssuePriority getPriority() { return priority; }
    public IssueStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
