package com.bugboard26.backend.user;

import com.bugboard26.backend.common.ApiException;
import com.bugboard26.backend.common.ListResponse;
import com.bugboard26.backend.security.CurrentUser;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class UserService {
    private final UserRepository users;
    private final CurrentUser currentUser;
    private final PasswordEncoder passwords;

    public UserService(UserRepository users, CurrentUser currentUser, PasswordEncoder passwords) {
        this.users = users;
        this.currentUser = currentUser;
        this.passwords = passwords;
    }

    public ListResponse<UserResponse> list() {
        currentUser.requireAdmin();
        return ListResponse.of(users.findAllByOrderByFullNameAscIdAsc().stream().map(UserResponse::from).toList());
    }

    @Transactional
    public UserResponse create(CreateUserRequest request) {
        currentUser.requireAdmin();
        PasswordPolicy.validate(request.password());
        var email = request.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_EXISTS", "An account with this email already exists.");
        }
        return UserResponse.from(users.saveAndFlush(new User(request.fullName().trim(), email,
                passwords.encode(request.password()), request.role())));
    }

    public UserResponse me() {
        return UserResponse.from(currentUser.get());
    }
}
