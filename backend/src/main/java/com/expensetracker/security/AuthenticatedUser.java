package com.expensetracker.security;

import com.expensetracker.entity.UserRole;

/**
 * What @AuthenticationPrincipal resolves to in controllers once the JWT
 * filter has validated a request's access token. Deliberately not the full
 * User entity — controllers get exactly the three fields they need, with
 * no risk of an N+1 lazy-load or accidentally serializing the password hash.
 */
public record AuthenticatedUser(Long userId, String username, UserRole role) {
}
