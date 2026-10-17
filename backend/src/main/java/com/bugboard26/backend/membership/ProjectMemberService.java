package com.bugboard26.backend.membership;

import com.bugboard26.backend.common.ApiException;
import com.bugboard26.backend.common.ListResponse;
import com.bugboard26.backend.project.ProjectAccess;
import com.bugboard26.backend.security.CurrentUser;
import com.bugboard26.backend.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ProjectMemberService {
    private final ProjectMembershipRepository memberships;
    private final UserRepository users;
    private final CurrentUser currentUser;
    private final ProjectAccess access;

    public ProjectMemberService(ProjectMembershipRepository memberships, UserRepository users,
                               CurrentUser currentUser, ProjectAccess access) {
        this.memberships = memberships;
        this.users = users;
        this.currentUser = currentUser;
        this.access = access;
    }

    public ListResponse<MemberResponse> list(Long projectId) {
        access.requireAccess(projectId);
        return ListResponse.of(memberships.findAllByProjectIdOrderByJoinedAtAscIdAsc(projectId)
                .stream().map(MemberResponse::from).toList());
    }

    @Transactional
    public MemberResponse add(Long projectId, AddMemberRequest request) {
        currentUser.requireAdmin();
        var project = access.requireAccess(projectId);
        var user = users.findById(request.userId()).orElseThrow(() -> ApiException.notFound("User"));
        if (memberships.existsByProjectIdAndUserId(projectId, user.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "ALREADY_MEMBER", "This user already belongs to the project.");
        }
        var membership = memberships.saveAndFlush(new ProjectMembership(project, user));
        project.touch();
        return MemberResponse.from(membership);
    }

    @Transactional
    public void remove(Long projectId, Long userId) {
        currentUser.requireAdmin();
        var project = access.requireAccess(projectId);
        var membership = memberships.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> ApiException.notFound("Membership"));
        memberships.delete(membership);
        project.touch();
    }
}
