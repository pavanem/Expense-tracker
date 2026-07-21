package com.expensetracker.exception;

/**
 * Thrown when login is attempted against an account currently in lockout
 * after too many consecutive failed attempts. Mapped to HTTP 423 (Locked).
 * Unlike InvalidCredentialsException, this message IS specific — since this
 * is a single-user app there's no second username to protect by staying
 * vague, and telling the real owner "you're locked out, try again in N
 * minutes" is more useful than mysterious silence.
 */
public class AccountLockedException extends RuntimeException {

    public AccountLockedException(String message) {
        super(message);
    }
}
