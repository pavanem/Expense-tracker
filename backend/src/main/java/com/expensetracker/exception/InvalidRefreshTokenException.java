package com.expensetracker.exception;

/**
 * Thrown when a presented refresh token doesn't match any stored hash, or
 * matches one that's expired. Mapped to HTTP 401 — the frontend's Axios
 * interceptor treats this as "session over, redirect to login."
 */
public class InvalidRefreshTokenException extends RuntimeException {

    public InvalidRefreshTokenException(String message) {
        super(message);
    }
}
