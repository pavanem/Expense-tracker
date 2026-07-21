package com.expensetracker.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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
public class RegisterRequest {

    @NotBlank(message = "Username is mandatory")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    @Pattern(regexp = "^[a-zA-Z0-9_.-]+$", message = "Username may only contain letters, numbers, underscores, dots, and hyphens")
    private String username;

    @NotBlank(message = "Password is mandatory")
    @Size(min = 10, max = 128, message = "Password must be at least 10 characters")
    // Deliberately not requiring a specific mix of character classes —
    // NIST 800-63B recommends length over composition rules, since
    // composition rules push people toward predictable patterns.
    private String password;
}
