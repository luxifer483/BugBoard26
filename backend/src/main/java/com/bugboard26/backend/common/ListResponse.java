package com.bugboard26.backend.common;

import java.util.List;

public record ListResponse<T>(List<T> items, long totalCount) {
    public static <T> ListResponse<T> of(List<T> items) {
        return new ListResponse<>(items, items.size());
    }
}
