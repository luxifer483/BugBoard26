package com.bugboard26.backend.issue;

import com.bugboard26.backend.common.ListResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class IssueController {
    private final IssueService issues;
    public IssueController(IssueService issues) { this.issues = issues; }

    @GetMapping("/projects/{projectId}/issues")
    public ListResponse<IssueResponse> listProject(@PathVariable Long projectId) { return issues.list(projectId); }

    @GetMapping("/issues")
    public ListResponse<IssueResponse> list() { return issues.list(null); }

    @GetMapping("/issues/{id}")
    public IssueResponse get(@PathVariable Long id) { return issues.get(id); }

    @PostMapping("/issues") @ResponseStatus(HttpStatus.CREATED)
    public IssueResponse create(@Valid @RequestBody CreateIssueRequest request) { return issues.create(request); }

    @PatchMapping("/issues/{id}/status")
    public IssueResponse status(@PathVariable Long id, @Valid @RequestBody UpdateIssueStatusRequest request) {
        return issues.updateStatus(id, request);
    }

    @PatchMapping("/issues/{id}/assignee")
    public IssueResponse assign(@PathVariable Long id, @Valid @RequestBody AssignIssueRequest request) {
        return issues.assign(id, request);
    }
}
