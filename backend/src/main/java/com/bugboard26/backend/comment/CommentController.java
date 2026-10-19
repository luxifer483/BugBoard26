package com.bugboard26.backend.comment;

import com.bugboard26.backend.common.ListResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/issues/{issueId}/comments")
public class CommentController {
    private final CommentService comments;
    public CommentController(CommentService comments) { this.comments = comments; }

    @GetMapping
    public ListResponse<CommentResponse> list(@PathVariable Long issueId) { return comments.list(issueId); }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse create(@PathVariable Long issueId, @Valid @RequestBody CreateCommentRequest request) {
        return comments.create(issueId, request);
    }
}
