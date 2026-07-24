package com.expensetracker.controller;

import com.expensetracker.dto.CreateUserRequest;
import com.expensetracker.dto.ResetPasswordRequest;
import com.expensetracker.dto.UpdateUserRequest;
import com.expensetracker.dto.UserResponse;
import com.expensetracker.security.AuthenticatedUser;
import com.expensetracker.service.AdminUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin-only user management endpoints.
 * Access restricted to ROLE_ADMIN by SecurityConfig — non-admins get 403.
 */
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@Tag(name = "Admin — User Management", description = "Create and manage user accounts (ADMIN only)")
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping
    @Operation(summary = "List all user accounts")
    public ResponseEntity<List<UserResponse>> listUsers() {
        return ResponseEntity.ok(adminUserService.listAllUsers());
    }

    @PostMapping
    @Operation(summary = "Create a new user account")
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminUserService.createUser(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a user's enabled state or role")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(adminUserService.updateUser(id, request));
    }

    @PostMapping("/{id}/reset-password")
    @Operation(summary = "Reset a user's password (revokes all their active sessions)")
    public ResponseEntity<Void> resetPassword(
            @PathVariable Long id,
            @Valid @RequestBody ResetPasswordRequest request) {
        adminUserService.resetPassword(id, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a user account (cannot delete your own account)")
    public ResponseEntity<Void> deleteUser(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        adminUserService.deleteUser(id, principal.userId());
        return ResponseEntity.noContent().build();
    }
}
