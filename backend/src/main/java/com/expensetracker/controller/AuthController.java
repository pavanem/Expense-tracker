package com.expensetracker.controller;

import com.expensetracker.config.JwtProperties;
import com.expensetracker.dto.AuthResponse;
import com.expensetracker.dto.ChangePasswordRequest;
import com.expensetracker.dto.LoginRequest;
import com.expensetracker.dto.RegisterRequest;
import com.expensetracker.exception.InvalidRefreshTokenException;
import com.expensetracker.security.AuthenticatedUser;
import com.expensetracker.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Registration, login, token refresh, and session management")
public class AuthController {

    /** Cookie is scoped to /api/auth so it's never sent on the (much more numerous) regular API calls. */
    private static final String REFRESH_COOKIE_NAME = "refresh_token";
    private static final String REFRESH_COOKIE_PATH = "/api/auth";

    private final AuthService authService;
    private final JwtProperties jwtProperties;

    @GetMapping("/registration-status")
    @Operation(summary = "Whether registration is still open (true only until the first account is created)")
    public ResponseEntity<java.util.Map<String, Boolean>> registrationStatus() {
        return ResponseEntity.ok(java.util.Map.of("open", authService.isRegistrationOpen()));
    }

    @PostMapping("/register")
    @Operation(summary = "Create the first (and only) account for this self-hosted instance")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
        AuthService.AuthResult result = authService.register(request, deviceLabelFrom(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie(result).toString())
                .body(result.response());
    }

    @PostMapping("/login")
    @Operation(summary = "Log in with username and password")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        if (request.getDeviceLabel() == null || request.getDeviceLabel().isBlank()) {
            request.setDeviceLabel(deviceLabelFrom(httpRequest));
        }

        AuthService.AuthResult result = authService.login(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie(result).toString())
                .body(result.response());
    }

    @PostMapping("/refresh")
    @Operation(summary = "Exchange the refresh-token cookie for a new access token (and a rotated refresh cookie)")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new InvalidRefreshTokenException("No refresh token cookie present");
        }
        AuthService.AuthResult result = authService.refresh(refreshToken);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie(result).toString())
                .body(result.response());
    }

    @PostMapping("/logout")
    @Operation(summary = "Log out this device (revokes only the current refresh token)")
    public ResponseEntity<Void> logout(@CookieValue(name = REFRESH_COOKIE_NAME, required = false) String refreshToken) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            authService.logout(refreshToken);
        }
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, buildExpiredCookie().toString())
                .build();
    }

    @PostMapping("/logout-all")
    @Operation(summary = "Log out every device (revokes all sessions for the current user)")
    public ResponseEntity<Void> logoutAll(@AuthenticationPrincipal AuthenticatedUser principal) {
        authService.logoutAll(principal.userId());
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, buildExpiredCookie().toString())
                .build();
    }

    @PostMapping("/change-password")
    @Operation(summary = "Change password (revokes all existing sessions on success — re-login required)")
    public ResponseEntity<Void> changePassword(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(principal.userId(), request);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, buildExpiredCookie().toString())
                .build();
    }

    @GetMapping("/me")
    @Operation(summary = "Current authenticated user, for frontend session bootstrap")
    public ResponseEntity<AuthenticatedUser> me(@AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok(principal);
    }

    private ResponseCookie buildRefreshCookie(AuthService.AuthResult result) {
        long maxAgeSeconds = Duration.between(LocalDateTime.now(), result.refreshTokenExpiresAt()).getSeconds();
        return ResponseCookie.from(REFRESH_COOKIE_NAME, result.rawRefreshToken())
                .httpOnly(true)
                .secure(jwtProperties.cookieSecure())
                .sameSite("Lax")
                .path(REFRESH_COOKIE_PATH)
                .maxAge(Math.max(maxAgeSeconds, 0))
                .build();
    }

    private ResponseCookie buildExpiredCookie() {
        return ResponseCookie.from(REFRESH_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(jwtProperties.cookieSecure())
                .sameSite("Lax")
                .path(REFRESH_COOKIE_PATH)
                .maxAge(0)
                .build();
    }

    private String deviceLabelFrom(HttpServletRequest request) {
        String userAgent = request.getHeader("User-Agent");
        return (userAgent == null || userAgent.isBlank()) ? "Unknown device" : userAgent;
    }
}
