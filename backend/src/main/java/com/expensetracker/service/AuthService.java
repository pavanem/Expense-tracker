package com.expensetracker.service;

import com.expensetracker.config.JwtProperties;
import com.expensetracker.dto.AuthResponse;
import com.expensetracker.dto.ChangePasswordRequest;
import com.expensetracker.dto.LoginRequest;
import com.expensetracker.dto.RegisterRequest;
import com.expensetracker.entity.RefreshToken;
import com.expensetracker.entity.User;
import com.expensetracker.entity.UserRole;
import com.expensetracker.exception.InvalidCredentialsException;
import com.expensetracker.exception.InvalidRefreshTokenException;
import com.expensetracker.exception.RefreshTokenReuseException;
import com.expensetracker.exception.RegistrationClosedException;
import com.expensetracker.exception.ResourceNotFoundException;
import com.expensetracker.repository.RefreshTokenRepository;
import com.expensetracker.repository.UserRepository;
import com.expensetracker.security.JwtService;
import com.expensetracker.security.TokenHasher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;

    /**
     * Only succeeds while zero users exist — see RegistrationClosedException.
     * The first (and, for this deployment model, only) account is granted
     * ADMIN so future admin-only features have somewhere to attach.
     */
    public AuthResult register(RegisterRequest request, String deviceLabel) {
        if (userRepository.count() > 0) {
            throw new RegistrationClosedException();
        }
        if (userRepository.existsByUsernameIgnoreCase(request.getUsername())) {
            // Unreachable in practice given the count()==0 guard above, but
            // kept as a defensive check in case that invariant ever changes.
            throw new RegistrationClosedException();
        }

        User user = User.builder()
                .username(request.getUsername())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(UserRole.ADMIN)
                .enabled(true)
                .build();
        user = userRepository.save(user);
        log.info("Registered first user id={} username={}", user.getId(), user.getUsername());

        return issueTokens(user, deviceLabel);
    }

    public AuthResult login(LoginRequest request) {
        User user = userRepository.findByUsernameIgnoreCase(request.getUsername())
                .orElseThrow(InvalidCredentialsException::new);

        if (!user.isEnabled() || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            // Same exception/message whether the user doesn't exist, is
            // disabled, or the password is wrong — no signal either way.
            throw new InvalidCredentialsException();
        }

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);
        log.info("User id={} logged in", user.getId());

        return issueTokens(user, request.getDeviceLabel());
    }

    /**
     * Validates the presented refresh token, and — if valid — rotates it:
     * the old token is revoked and a brand new one issued, extending the
     * session without ever reusing a token value. If the presented token
     * matches a hash that's already revoked, that's treated as token theft
     * (a legitimate client never re-presents a token it already rotated
     * away) and every active session for the user is revoked immediately.
     */
    public AuthResult refresh(String rawRefreshToken) {
        String hash = TokenHasher.sha256Hex(rawRefreshToken);
        RefreshToken stored = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new InvalidRefreshTokenException("Refresh token not recognized"));

        if (stored.getRevokedAt() != null) {
            // Grace period (30 seconds): if this token was rotated very recently and has a recorded
            // replacement hash, return a fresh token pair rather than treating concurrent/retried
            // requests as token theft. Legitimate mobile apps often experience packet latency or
            // duplicate parallel requests on app launch.
            if (stored.getReplacedByHash() != null &&
                    stored.getRevokedAt().isAfter(LocalDateTime.now().minusSeconds(30))) {
                log.info("Refresh token presented within 30s grace period for user id={} — returning fresh token pair",
                        stored.getUser().getId());
                User user = stored.getUser();
                return issueTokens(user, stored.getDeviceLabel());
            }

            log.warn("Refresh token reuse detected for user id={} outside grace period — revoking all sessions", stored.getUser().getId());
            refreshTokenRepository.revokeAllActiveForUser(stored.getUser().getId(), LocalDateTime.now());
            throw new RefreshTokenReuseException(
                    "This session was already used elsewhere and has been revoked for your security. Please log in again.");
        }

        if (stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new InvalidRefreshTokenException("Refresh token has expired");
        }

        User user = stored.getUser();
        AuthResult next = issueTokens(user, stored.getDeviceLabel());

        stored.setRevokedAt(LocalDateTime.now());
        stored.setReplacedByHash(TokenHasher.sha256Hex(next.rawRefreshToken()));
        refreshTokenRepository.save(stored);

        return next;
    }

    /** Revokes a single session (the one tied to this refresh token) — "log out this device." */
    public void logout(String rawRefreshToken) {
        String hash = TokenHasher.sha256Hex(rawRefreshToken);
        refreshTokenRepository.findByTokenHash(hash).ifPresent(token -> {
            token.setRevokedAt(LocalDateTime.now());
            refreshTokenRepository.save(token);
        });
    }

    /** Revokes every session for the user — "log out everywhere." */
    public void logoutAll(Long userId) {
        refreshTokenRepository.revokeAllActiveForUser(userId, LocalDateTime.now());
        log.info("Revoked all sessions for user id={}", userId);
    }

    /** Public/unauthenticated check the frontend uses to decide whether to show a Register or Login form. */
    @Transactional(readOnly = true)
    public boolean isRegistrationOpen() {
        return userRepository.count() == 0;
    }

    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.forEntity("User", userId));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Changing your password invalidates every existing session,
        // including the one that just made this request — the client is
        // expected to log in fresh afterward. Standard enterprise behavior.
        refreshTokenRepository.revokeAllActiveForUser(userId, LocalDateTime.now());
        log.info("Password changed for user id={}; all sessions revoked", userId);
    }

    private AuthResult issueTokens(User user, String deviceLabel) {
        String accessToken = jwtService.generateAccessToken(user);
        String rawRefreshToken = TokenHasher.generateRawToken();
        LocalDateTime refreshExpiresAt = LocalDateTime.now().plusDays(jwtProperties.refreshTokenExpiryDays());

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(TokenHasher.sha256Hex(rawRefreshToken))
                .expiresAt(refreshExpiresAt)
                .deviceLabel(deviceLabel)
                .build();
        refreshTokenRepository.save(refreshToken);

        AuthResponse response = AuthResponse.builder()
                .accessToken(accessToken)
                .expiresInSeconds(jwtService.accessTokenExpirySeconds())
                .userId(user.getId())
                .username(user.getUsername())
                .role(user.getRole())
                .build();

        return new AuthResult(response, rawRefreshToken, refreshExpiresAt);
    }

    /**
     * Internal carrier for the raw refresh token value — this never leaves
     * the service layer as-is. AuthController takes rawRefreshToken() and
     * sets it as an httpOnly cookie; it is not part of AuthResponse/JSON.
     */
    public record AuthResult(AuthResponse response, String rawRefreshToken, LocalDateTime refreshTokenExpiresAt) {
    }
}
