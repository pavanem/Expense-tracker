package com.expensetracker.dto;

import com.expensetracker.entity.UserRole;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Deliberately does NOT include the refresh token by default. The refresh
 * token is set by AuthController as an httpOnly/Secure/SameSite cookie so
 * client-side JavaScript (and therefore XSS) can never read it.
 *
 * Exception: mobile clients (identified by the {@code X-Client-Type: mobile}
 * request header) receive the refresh token in the {@code refreshToken} field
 * so they can persist it in the OS secure store (Android Keystore / iOS
 * Keychain). The field is omitted from the JSON response for web clients.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthResponse {
    private String accessToken;
    @Builder.Default
    private String tokenType = "Bearer";
    private long expiresInSeconds;
    private Long userId;
    private String username;
    private UserRole role;

    /**
     * Only populated for mobile clients — null for web clients (omitted from JSON).
     * The mobile app stores this in expo-secure-store and sends it in the
     * body of /auth/refresh and /auth/logout calls instead of via cookie.
     */
    private String refreshToken;

    /** Returns a copy of this response with the refreshToken field populated (for mobile). */
    public AuthResponse withRefreshToken(String rawRefreshToken) {
        return AuthResponse.builder()
                .accessToken(this.accessToken)
                .tokenType(this.tokenType)
                .expiresInSeconds(this.expiresInSeconds)
                .userId(this.userId)
                .username(this.username)
                .role(this.role)
                .refreshToken(rawRefreshToken)
                .build();
    }
}
