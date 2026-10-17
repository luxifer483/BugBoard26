package com.bugboard26.backend.security;

import com.bugboard26.backend.common.ApiException;
import com.bugboard26.backend.user.Role;
import com.bugboard26.backend.user.User;
import com.bugboard26.backend.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class CurrentUser {
    private final UserRepository users;

    public CurrentUser(UserRepository users) { this.users = users; }

    public User get() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw unauthenticated();
        }
        try {
            return users.findById(Long.parseLong(authentication.getName())).orElseThrow(CurrentUser::unauthenticated);
        } catch (NumberFormatException exception) {
            throw unauthenticated();
        }
    }

    public void requireAdmin() {
        if (get().getRole() != Role.ADMIN) { throw ApiException.forbidden(); }
    }

    private static ApiException unauthenticated() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required.");
    }
}
