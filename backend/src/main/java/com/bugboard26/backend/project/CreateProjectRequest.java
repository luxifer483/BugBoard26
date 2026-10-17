package com.bugboard26.backend.project;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateProjectRequest(@NotBlank @Size(max = 120) String name,
                                   @NotBlank @Size(max = 2000) String description) {}
