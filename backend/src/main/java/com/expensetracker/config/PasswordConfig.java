package com.expensetracker.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class PasswordConfig {

    /**
     * Strength 12 (default is 10) — a deliberate cost increase for password
     * hashing since this only runs at login/registration time, not on the
     * hot path, so the extra ~4x compute cost is cheap insurance against
     * offline brute-force if the hash ever leaks.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
