package com.expensetracker.exception;

/**
 * Thrown when a create/update would violate a uniqueness constraint
 * (e.g. duplicate category name). Mapped to HTTP 409 by GlobalExceptionHandler.
 */
public class DuplicateResourceException extends RuntimeException {

    public DuplicateResourceException(String message) {
        super(message);
    }
}
