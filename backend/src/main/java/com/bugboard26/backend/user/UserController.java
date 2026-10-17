package com.bugboard26.backend.user;

import com.bugboard26.backend.common.ListResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService users;

    public UserController(UserService users) { this.users = users; }

    @GetMapping
    public ListResponse<UserResponse> list() { return users.list(); }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody CreateUserRequest request) { return users.create(request); }

    @GetMapping("/me")
    public UserResponse me() { return users.me(); }
}
