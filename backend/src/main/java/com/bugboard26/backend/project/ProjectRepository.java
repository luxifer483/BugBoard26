package com.bugboard26.backend.project;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findAllByOrderByUpdatedAtDescIdDesc();

    @Query("select p from Project p where exists (select m.id from ProjectMembership m "
            + "where m.project = p and m.user.id = :userId) order by p.updatedAt desc, p.id desc")
    List<Project> findVisibleTo(Long userId);
}
