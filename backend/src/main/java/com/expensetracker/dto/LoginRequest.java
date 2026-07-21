package com.expensetracker.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginRequest {

    @NotBlank(message = "Username is mandatory")
    private String username;

    @NotBlank(message = "Password is mandatory")
    private String password;

    /**
     * Optional human-readable label for this session (e.g. "Chrome on
     * Pixel 8"), captured from the frontend and stored alongside the
     * refresh token purely so a future "active sessions" view can show
     * something meaningful. Never affects auth logic.
     */
    private String deviceLabel;
}
