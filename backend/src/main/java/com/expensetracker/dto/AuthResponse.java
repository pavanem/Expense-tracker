package com.expensetracker.dto;

import com.expensetracker.entity.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Deliberately does NOT include the refresh token. The refresh token is set
 * by AuthController as an httpOnly/Secure/SameSite cookie so client-side
 * JavaScript (and therefore XSS) can never read it — only the access token,
 * which is short-lived and meant to be held in memory, appears here.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String accessToken;
    @Builder.Default
    private String tokenType = "Bearer";
    private long expiresInSeconds;
    private Long userId;
    private String username;
    private UserRole role;
}
