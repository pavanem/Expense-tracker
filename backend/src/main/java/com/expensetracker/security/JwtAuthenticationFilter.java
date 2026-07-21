package com.expensetracker.security;

import com.expensetracker.entity.UserRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Runs once per request, before Spring Security's authorization checks.
 * Looks for "Authorization: Bearer <token>", and if it's a valid,
 * unexpired access token, populates the SecurityContext so downstream
 * @AuthenticationPrincipal / hasRole() checks work. Any failure here is
 * silent (no exception thrown) — an invalid/missing token simply means the
 * request proceeds unauthenticated, and it's SecurityConfig's authorization
 * rules (not this filter) that turn that into a 401 for protected routes.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String AUTH_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String header = request.getHeader(AUTH_HEADER);
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            String token = header.substring(BEARER_PREFIX.length());
            try {
                Claims claims = jwtService.parseAndValidate(token);
                AuthenticatedUser principal = new AuthenticatedUser(
                        jwtService.extractUserId(claims),
                        claims.getSubject(),
                        UserRole.valueOf(jwtService.extractRole(claims)));

                var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + principal.role().name()));
                var authentication = new UsernamePasswordAuthenticationToken(principal, null, authorities);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (JwtException | IllegalArgumentException e) {
                // Expired, malformed, bad signature, or an unrecognized role
                // claim — treat all the same: request continues unauthenticated.
                log.debug("Rejected access token on {}: {}", request.getRequestURI(), e.getMessage());
                SecurityContextHolder.clearContext();
            }
        }

        chain.doFilter(request, response);
    }
}
