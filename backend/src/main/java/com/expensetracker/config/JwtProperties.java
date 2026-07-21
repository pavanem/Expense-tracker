package com.expensetracker.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Backs the app.jwt.* keys in application.yml. A missing/blank secret in
 * production is a deployment mistake worth failing loudly on, rather than
 * silently signing tokens with a weak default — see JwtService for that check.
 */
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(
        String secret,
        long accessTokenExpiryMinutes,
        long refreshTokenExpiryDays,
        String issuer,
        boolean cookieSecure
) {
    public JwtProperties {
        if (accessTokenExpiryMinutes <= 0) {
            accessTokenExpiryMinutes = 15;
        }
        if (refreshTokenExpiryDays <= 0) {
            refreshTokenExpiryDays = 30;
        }
        if (issuer == null || issuer.isBlank()) {
            issuer = "expense-tracker";
        }
    }
}
