package com.expensetracker.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "app_user")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "passwordHash") // never let the hash leak into logs
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "username", nullable = false, unique = true, length = 50)
    private String username;

    /** BCrypt hash — never the raw password. See PasswordConfig for the encoder. */
    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    @Builder.Default
    private UserRole role = UserRole.USER;

    @Column(name = "enabled", nullable = false)
    @Builder.Default
    private boolean enabled = true;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    /** Consecutive failed login attempts since the last success or unlock — see AuthService. */
    @Column(name = "failed_login_attempts", nullable = false)
    @Builder.Default
    private int failedLoginAttempts = 0;

    /** Null = not locked. In the past = lock has expired (treated as unlocked). */
    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
