package com.expensetracker.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Uniform error payload returned by every failed API call, so the frontend
 * can rely on a single shape regardless of which exception fired.
 */
@Getter
@Builder
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {

    private LocalDateTime timestamp;
    private int status;
    private String error;
    private String message;
    private String path;

    /** Field -> validation message, populated only for 400 validation errors. */
    private Map<String, String> fieldErrors;
}
