package com.expensetracker.controller;

import com.expensetracker.config.JwtProperties;
import com.expensetracker.dto.AuthResponse;
import com.expensetracker.dto.LoginRequest;
import com.expensetracker.dto.RegisterRequest;
import com.expensetracker.entity.UserRole;
import com.expensetracker.exception.InvalidCredentialsException;
import com.expensetracker.exception.InvalidRefreshTokenException;
import com.expensetracker.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import com.expensetracker.security.JwtService;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private AuthService authService;
    @MockBean private JwtProperties jwtProperties;
    @MockBean private JwtService jwtService;

    private AuthService.AuthResult sampleAuthResult;

    @BeforeEach
    void setUp() {
        when(jwtProperties.cookieSecure()).thenReturn(false);

        AuthResponse baseResponse = AuthResponse.builder()
                .accessToken("test-jwt-access-token")
                .tokenType("Bearer")
                .expiresInSeconds(900)
                .userId(1L)
                .username("pavan")
                .role(UserRole.ADMIN)
                .build();

        sampleAuthResult = new AuthService.AuthResult(
                baseResponse,
                "raw-sample-refresh-token",
                LocalDateTime.now().plusDays(30)
        );
    }

    @Test
    void registrationStatus_returnsOpenState() throws Exception {
        when(authService.isRegistrationOpen()).thenReturn(true);

        mockMvc.perform(get("/api/auth/registration-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.open").value(true));
    }

    @Test
    void login_forWebClient_setsRefreshCookie_andOmitsRefreshTokenFromJson() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .username("pavan")
                .password("password123")
                .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(sampleAuthResult);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(header().exists("Set-Cookie"))
                .andExpect(header().string("Set-Cookie", containsString("refresh_token=raw-sample-refresh-token")))
                .andExpect(jsonPath("$.accessToken").value("test-jwt-access-token"))
                .andExpect(jsonPath("$.username").value("pavan"))
                .andExpect(jsonPath("$.refreshToken").doesNotExist());
    }

    @Test
    void login_forMobileClient_includesRefreshTokenInJsonBody() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .username("pavan")
                .password("password123")
                .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(sampleAuthResult);

        mockMvc.perform(post("/api/auth/login")
                        .header("X-Client-Type", "mobile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("test-jwt-access-token"))
                .andExpect(jsonPath("$.refreshToken").value("raw-sample-refresh-token"));
    }

    @Test
    void refresh_viaCookie_withNoBody_succeeds() throws Exception {
        when(authService.refresh("cookie-refresh-token")).thenReturn(sampleAuthResult);

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new Cookie("refresh_token", "cookie-refresh-token")))
                .andExpect(status().isOk())
                .andExpect(header().exists("Set-Cookie"))
                .andExpect(jsonPath("$.accessToken").value("test-jwt-access-token"))
                .andExpect(jsonPath("$.refreshToken").doesNotExist());

        verify(authService).refresh("cookie-refresh-token");
    }

    @Test
    void refresh_viaCookie_withFormUrlEncoded_nullBody_doesNotThrow500() throws Exception {
        // This is the exact scenario where Axios sends application/x-www-form-urlencoded with empty body.
        // It must NOT fail with HttpMediaTypeNotSupportedException (500).
        when(authService.refresh("cookie-refresh-token")).thenReturn(sampleAuthResult);

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new Cookie("refresh_token", "cookie-refresh-token"))
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED))
                .andExpect(status().isOk())
                .andExpect(header().exists("Set-Cookie"))
                .andExpect(jsonPath("$.accessToken").value("test-jwt-access-token"));

        verify(authService).refresh("cookie-refresh-token");
    }

    @Test
    void refresh_viaMobileClient_withJsonBody_succeeds() throws Exception {
        when(authService.refresh("mobile-raw-token")).thenReturn(sampleAuthResult);

        String jsonBody = "{\"refreshToken\":\"mobile-raw-token\"}";

        mockMvc.perform(post("/api/auth/refresh")
                        .header("X-Client-Type", "mobile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("test-jwt-access-token"))
                .andExpect(jsonPath("$.refreshToken").value("raw-sample-refresh-token"));

        verify(authService).refresh("mobile-raw-token");
    }

    @Test
    void refresh_withoutCookieAndWithoutBody_returns401() throws Exception {
        mockMvc.perform(post("/api/auth/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("No refresh token provided"));
    }

    @Test
    void refresh_whenTokenInvalid_returns401() throws Exception {
        when(authService.refresh("invalid-token"))
                .thenThrow(new InvalidRefreshTokenException("Refresh token not recognized"));

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new Cookie("refresh_token", "invalid-token")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Refresh token not recognized"));
    }

    @Test
    void logout_viaCookie_succeeds() throws Exception {
        mockMvc.perform(post("/api/auth/logout")
                        .cookie(new Cookie("refresh_token", "valid-cookie-token")))
                .andExpect(status().isNoContent())
                .andExpect(header().exists("Set-Cookie"))
                .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));

        verify(authService).logout("valid-cookie-token");
    }

    @Test
    void logout_viaMobileJsonBody_succeeds() throws Exception {
        String jsonBody = "{\"refreshToken\":\"mobile-logout-token\"}";

        mockMvc.perform(post("/api/auth/logout")
                        .header("X-Client-Type", "mobile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonBody))
                .andExpect(status().isNoContent());

        verify(authService).logout("mobile-logout-token");
    }

    @Test
    void unsupportedMediaType_onBodyEndpoint_returns415_not500() throws Exception {
        // An endpoint that requires @RequestBody (like register) with invalid content-type
        // should return 415 Unsupported Media Type, not an unhandled 500 error.
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("hello"))
                .andExpect(status().isUnsupportedMediaType());
    }
}
