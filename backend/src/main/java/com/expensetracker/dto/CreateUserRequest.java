package com.expensetracker.dto;

import com.expensetracker.entity.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

/** Request body for admin creating a new user account. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateUserRequest {

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be 3–50 characters")
    @Pattern(regexp = "^[a-zA-Z0-9._-]+$",
             message = "Username may only contain letters, digits, dots, underscores and hyphens")
    private String username;

    @NotBlank(message = "Password is required")
    @Size(min = 10, message = "Password must be at least 10 characters")
    private String password;

    /** Defaults to USER when not supplied. */
    private UserRole role;
}
