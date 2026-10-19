package com.bugboard26.backend.comment;

import java.util.List;
import org.springframework.data.jpa.repository.*;

public interface CommentRepository extends JpaRepository<IssueComment, Long> {
    @EntityGraph(attributePaths = {"author"})
    List<IssueComment> findAllByIssueIdOrderByCreatedAtAscIdAsc(Long issueId);
}
