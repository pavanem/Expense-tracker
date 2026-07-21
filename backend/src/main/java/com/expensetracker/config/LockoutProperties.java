package com.expensetracker.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.security.lockout")
public record LockoutProperties(int maxAttempts, int durationMinutes) {
    public LockoutProperties {
        if (maxAttempts <= 0) {
            maxAttempts = 5;
        }
        if (durationMinutes <= 0) {
            durationMinutes = 15;
        }
    }
}
