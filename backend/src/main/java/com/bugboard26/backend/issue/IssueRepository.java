package com.bugboard26.backend.issue;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;

public interface IssueRepository extends JpaRepository<Issue, Long> {
    @EntityGraph(attributePaths = {"project", "reporter", "assignee"})
    List<Issue> findAllByProjectIdOrderByUpdatedAtDescIdDesc(Long projectId);

    @EntityGraph(attributePaths = {"project", "reporter", "assignee"})
    List<Issue> findAllByOrderByUpdatedAtDescIdDesc();

    @EntityGraph(attributePaths = {"project", "reporter", "assignee"})
    @Query("select i from Issue i where exists (select m.id from ProjectMembership m "
            + "where m.project = i.project and m.user.id = :userId) order by i.updatedAt desc, i.id desc")
    List<Issue> findVisibleTo(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Issue i where i.id = :id")
    Optional<Issue> findForUpdate(Long id);

    long countByProjectId(Long projectId);
    long countByProjectIdAndStatus(Long projectId, IssueStatus status);
}
