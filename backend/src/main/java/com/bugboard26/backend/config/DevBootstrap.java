package com.bugboard26.backend.config;

import com.bugboard26.backend.user.*;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile("dev")
public class DevBootstrap implements ApplicationRunner {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final String email;
    private final String password;
    private final String fullName;

    public DevBootstrap(UserRepository users, PasswordEncoder passwords,
            @Value("${app.bootstrap.email}") String email, @Value("${app.bootstrap.password}") String password,
            @Value("${app.bootstrap.full-name}") String fullName) {
        this.users = users;
        this.passwords = passwords;
        this.email = email.trim().toLowerCase(Locale.ROOT);
        this.password = password;
        this.fullName = fullName;
    }

    @Override @Transactional
    public void run(ApplicationArguments args) {
        if (!users.existsByEmail(email)) {
            PasswordPolicy.validate(password);
            users.saveAndFlush(new User(fullName, email, passwords.encode(password), Role.ADMIN));
        }
    }
}
