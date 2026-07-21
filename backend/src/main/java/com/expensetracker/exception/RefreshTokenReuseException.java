package com.expensetracker.exception;

/**
 * Thrown when a refresh token that was already rotated away (revoked) gets
 * presented again. In legitimate use this never happens — each refresh
 * token is used exactly once and immediately replaced — so a repeat
 * presentation is a strong signal the token was copied/stolen. AuthService
 * responds by revoking every active session for that user. Mapped to
 * HTTP 401, same as any other invalid-refresh-token case, so a client
 * (or attacker) can't distinguish "expired" from "theft detected."
 */
public class RefreshTokenReuseException extends RuntimeException {

    public RefreshTokenReuseException(String message) {
        super(message);
    }
}
