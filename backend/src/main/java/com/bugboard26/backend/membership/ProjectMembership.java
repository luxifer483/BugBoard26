package com.bugboard26.backend.membership;

import com.bugboard26.backend.project.Project;
import com.bugboard26.backend.user.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "project_memberships", uniqueConstraints = @UniqueConstraint(
        name = "uk_membership_project_user", columnNames = {"project_id", "user_id"}))
public class ProjectMembership {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "project_id", nullable = false)
    private Project project;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @Column(nullable = false, updatable = false)
    private Instant joinedAt;

    protected ProjectMembership() {}
    public ProjectMembership(Project project, User user) {
        this.project = project;
        this.user = user;
        this.joinedAt = Instant.now();
    }

    public Project getProject() { return project; }
    public User getUser() { return user; }
    public Instant getJoinedAt() { return joinedAt; }
}
