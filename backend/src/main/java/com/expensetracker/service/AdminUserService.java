package com.expensetracker.service;

import com.expensetracker.dto.CreateUserRequest;
import com.expensetracker.dto.ResetPasswordRequest;
import com.expensetracker.dto.UpdateUserRequest;
import com.expensetracker.dto.UserResponse;
import com.expensetracker.entity.User;
import com.expensetracker.entity.UserRole;
import com.expensetracker.exception.InvalidRequestException;
import com.expensetracker.exception.ResourceNotFoundException;
import com.expensetracker.repository.RefreshTokenRepository;
import com.expensetracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Admin-only user management: create, list, update, reset password, delete.
 * All methods require ROLE_ADMIN — enforced at SecurityConfig level.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AdminUserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UserResponse> listAllUsers() {
        return userRepository.findAll(Sort.by("createdAt"))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public UserResponse createUser(CreateUserRequest request) {
        if (userRepository.existsByUsernameIgnoreCase(request.getUsername())) {
            throw new InvalidRequestException("Username already taken: " + request.getUsername());
        }

        UserRole role = request.getRole() != null ? request.getRole() : UserRole.USER;

        User user = User.builder()
                .username(request.getUsername())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .enabled(true)
                .build();
        user = userRepository.save(user);
        log.info("Admin created user id={} username={} role={}", user.getId(), user.getUsername(), role);
        return toResponse(user);
    }

    /**
     * Updates a user's enabled state and/or role.
     * Disabling a user immediately revokes all their active sessions.
     */
    public UserResponse updateUser(Long id, UpdateUserRequest request) {
        User user = getUserOrThrow(id);

        if (request.getEnabled() != null) {
            user.setEnabled(request.getEnabled());
            if (!request.getEnabled()) {
                refreshTokenRepository.revokeAllActiveForUser(id, LocalDateTime.now());
                log.info("Disabled user id={}: revoked all active sessions", id);
            }
        }
        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }

        return toResponse(userRepository.save(user));
    }

    /**
     * Resets a user's password and revokes all their existing sessions —
     * they must log in again with the new password.
     */
    public void resetPassword(Long id, ResetPasswordRequest request) {
        User user = getUserOrThrow(id);
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        refreshTokenRepository.revokeAllActiveForUser(id, LocalDateTime.now());
        log.info("Admin reset password for user id={}", id);
    }

    /**
     * Permanently deletes a user. Prevents self-deletion.
     */
    public void deleteUser(Long id, Long requestingAdminId) {
        if (id.equals(requestingAdminId)) {
            throw new InvalidRequestException("You cannot delete your own account.");
        }
        User user = getUserOrThrow(id);
        refreshTokenRepository.revokeAllActiveForUser(id, LocalDateTime.now());
        userRepository.delete(user);
        log.info("Admin id={} deleted user id={}", requestingAdminId, id);
    }

    private User getUserOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.forEntity("User", id));
    }

    private UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .role(user.getRole())
                .enabled(user.isEnabled())
                .lastLoginAt(user.getLastLoginAt())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
