package com.expensetracker.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

/** Request body for admin resetting another user's password. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResetPasswordRequest {

    @NotBlank(message = "New password is required")
    @Size(min = 10, message = "Password must be at least 10 characters")
    private String newPassword;
}
