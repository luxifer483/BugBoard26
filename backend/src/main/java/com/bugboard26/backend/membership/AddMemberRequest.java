package com.bugboard26.backend.membership;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record AddMemberRequest(@NotNull @Positive Long userId) {}
