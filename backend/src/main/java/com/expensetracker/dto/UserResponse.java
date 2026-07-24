package com.expensetracker.dto;

import com.expensetracker.entity.UserRole;
import lombok.*;

import java.time.LocalDateTime;

/** Read-only view of a user account returned by admin endpoints. Never exposes password hash. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {
    private Long id;
    private String username;
    private UserRole role;
    private boolean enabled;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;
}
