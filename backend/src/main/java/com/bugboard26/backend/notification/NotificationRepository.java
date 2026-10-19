package com.bugboard26.backend.notification;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    @Query("select n from Notification n join fetch n.issue i where n.recipient.id = :userId "
            + "and (:admin = true or exists (select m.id from ProjectMembership m "
            + "where m.project = i.project and m.user.id = :userId)) order by n.createdAt desc, n.id desc")
    List<Notification> findVisibleTo(Long userId, boolean admin);

    Optional<Notification> findByIdAndRecipientId(Long id, Long recipientId);
}
