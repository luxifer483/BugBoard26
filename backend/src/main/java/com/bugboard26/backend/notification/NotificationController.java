package com.bugboard26.backend.notification;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService notifications;
    public NotificationController(NotificationService notifications) { this.notifications = notifications; }

    @GetMapping
    public NotificationListResponse list() { return notifications.list(); }

    @PatchMapping("/{id}/read")
    public NotificationResponse read(@PathVariable Long id) { return notifications.markRead(id); }
}
