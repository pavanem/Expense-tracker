package com.expensetracker.exception;

/**
 * This app is single-user/self-hosted: registration is only permitted while
 * zero users exist. Once the first account is created, anyone who reaches
 * the server can no longer create a second one. Mapped to HTTP 403.
 */
public class RegistrationClosedException extends RuntimeException {

    public RegistrationClosedException() {
        super("Registration is closed — an account already exists for this instance");
    }
}
