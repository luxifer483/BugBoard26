package com.bugboard26.backend.membership;

import com.bugboard26.backend.common.ListResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects/{projectId}/members")
public class ProjectMemberController {
    private final ProjectMemberService members;
    public ProjectMemberController(ProjectMemberService members) { this.members = members; }

    @GetMapping
    public ListResponse<MemberResponse> list(@PathVariable Long projectId) { return members.list(projectId); }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public MemberResponse add(@PathVariable Long projectId, @Valid @RequestBody AddMemberRequest request) {
        return members.add(projectId, request);
    }

    @DeleteMapping("/{userId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable Long projectId, @PathVariable Long userId) { members.remove(projectId, userId); }
}
