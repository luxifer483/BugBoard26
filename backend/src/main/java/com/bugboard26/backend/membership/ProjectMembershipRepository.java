package com.bugboard26.backend.membership;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectMembershipRepository extends JpaRepository<ProjectMembership, Long> {
    boolean existsByProjectIdAndUserId(Long projectId, Long userId);
    long countByProjectId(Long projectId);
    @EntityGraph(attributePaths = {"user"})
    List<ProjectMembership> findAllByProjectIdOrderByJoinedAtAscIdAsc(Long projectId);
    Optional<ProjectMembership> findByProjectIdAndUserId(Long projectId, Long userId);
}
