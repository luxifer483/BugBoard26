package com.bugboard26.backend.issue;

import com.bugboard26.backend.common.ApiException;
import com.bugboard26.backend.project.ProjectAccess;
import org.springframework.stereotype.Component;

@Component
public class IssueAccess {
    private final IssueRepository issues;
    private final ProjectAccess projects;

    public IssueAccess(IssueRepository issues, ProjectAccess projects) {
        this.issues = issues;
        this.projects = projects;
    }

    public Issue requireAccess(Long id) {
        var issue = issues.findById(id).orElseThrow(() -> ApiException.notFound("Issue"));
        projects.requireAccess(issue.getProject().getId());
        return issue;
    }

    // Serialize changes on the same issue so repeated requests do not duplicate notifications.
    public Issue requireForUpdate(Long id) {
        var issue = issues.findForUpdate(id).orElseThrow(() -> ApiException.notFound("Issue"));
        projects.requireAccess(issue.getProject().getId());
        return issue;
    }
}
