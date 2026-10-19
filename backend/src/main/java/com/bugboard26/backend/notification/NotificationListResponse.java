package com.bugboard26.backend.notification;

import java.util.List;

public record NotificationListResponse(List<NotificationResponse> items, long totalCount, long unreadCount) {}
