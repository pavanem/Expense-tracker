package com.expensetracker.exception;

/**
 * Thrown for both "username not found" and "wrong password" — the message
 * is identical either way so a client can't use response differences to
 * enumerate valid usernames. Mapped to HTTP 401.
 */
public class InvalidCredentialsException extends RuntimeException {

    public InvalidCredentialsException() {
        super("Invalid username or password");
    }
}
