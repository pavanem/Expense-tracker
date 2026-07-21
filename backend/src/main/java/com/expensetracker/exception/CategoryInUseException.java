package com.expensetracker.exception;

/**
 * Thrown when attempting to hard-delete a category that still has expenses
 * referencing it. Mapped to HTTP 409 by GlobalExceptionHandler.
 * Callers should deactivate the category instead (see CategoryService).
 */
public class CategoryInUseException extends RuntimeException {

    public CategoryInUseException(String message) {
        super(message);
    }
}
