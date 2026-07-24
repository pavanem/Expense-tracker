package com.expensetracker.dto;

import com.expensetracker.entity.UserRole;
import lombok.*;

/** Request body for admin updating a user's enabled state or role. All fields are optional (partial update). */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateUserRequest {
    /** When false, revokes all active sessions and blocks future logins. */
    private Boolean enabled;
    private UserRole role;
}
