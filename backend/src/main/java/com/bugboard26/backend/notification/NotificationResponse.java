package com.bugboard26.backend.notification;

import java.time.Instant;

public record NotificationResponse(Long id, Long issueId, String message, boolean read, Instant createdAt) {
    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(notification.getId(), notification.getIssue().getId(),
                notification.getMessage(), notification.isRead(), notification.getCreatedAt());
    }
}
