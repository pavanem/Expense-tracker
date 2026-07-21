package com.expensetracker.exception;

/**
 * Thrown for semantically invalid requests that pass bean validation but are
 * still invalid from a business-rule perspective (e.g. start date after end
 * date). Mapped to HTTP 400 by GlobalExceptionHandler.
 */
public class InvalidRequestException extends RuntimeException {

    public InvalidRequestException(String message) {
        super(message);
    }
}
