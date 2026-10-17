package com.bugboard26.backend.project;

import com.bugboard26.backend.common.ListResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    private final ProjectService projects;
    public ProjectController(ProjectService projects) { this.projects = projects; }

    @GetMapping
    public ListResponse<ProjectResponse> list() { return projects.list(); }

    @GetMapping("/{id}")
    public ProjectResponse get(@PathVariable Long id) { return projects.get(id); }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public ProjectResponse create(@Valid @RequestBody CreateProjectRequest request) { return projects.create(request); }
}
