package com.bugboard26.backend.membership;

import com.bugboard26.backend.user.Role;
import java.time.Instant;

public record MemberResponse(Long projectId, Long userId, String fullName, String email, Role role, Instant joinedAt) {
    public static MemberResponse from(ProjectMembership membership) {
        var user = membership.getUser();
        return new MemberResponse(membership.getProject().getId(), user.getId(), user.getFullName(),
                user.getEmail(), user.getRole(), membership.getJoinedAt());
    }
}
