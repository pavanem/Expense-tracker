package com.expensetracker.config;

import com.expensetracker.security.JwtAuthenticationFilter;
import com.expensetracker.security.RestAccessDeniedHandler;
import com.expensetracker.security.RestAuthenticationEntryPoint;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * With app.security.enabled=true (recommended for any deployment reachable
 * beyond localhost — see .env.example), every /api/** endpoint requires a
 * valid JWT access token EXCEPT registration/login/refresh, which obviously
 * can't require one. Auth is stateless: no HttpSession, no server-side
 * DaoAuthenticationProvider/UserDetailsService — JwtAuthenticationFilter is
 * the entire authentication mechanism, running before Spring Security's own
 * UsernamePasswordAuthenticationFilter (which stays unused/disabled here;
 * it's excluded from the import above deliberately — auth happens via
 * AuthController + AuthService, not a Spring Security form-login flow).
 *
 * app.security.enabled=false (the default, matching the original SRS
 * "authentication may be disabled for v1") keeps every endpoint open — used
 * for local development before you've set up an account, or deployments
 * that only ever run on trusted hardware with no network exposure at all.
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    @Value("${app.security.enabled:false}")
    private boolean securityEnabled;

    @Value("${app.cors.allowed-origins}")
    private List<String> allowedOrigins;

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RestAuthenticationEntryPoint restAuthenticationEntryPoint;
    private final RestAccessDeniedHandler restAccessDeniedHandler;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // CSRF is not needed here: state-changing API calls authenticate
            // via the "Authorization: Bearer <token>" header, which (unlike
            // a cookie) browsers never attach automatically to cross-site
            // requests. The one cookie we do set (the refresh token) is
            // scoped to /api/auth, httpOnly, and SameSite=Lax, which blocks
            // it from being sent on cross-site POSTs in the first place.
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(handling -> handling
                    .authenticationEntryPoint(restAuthenticationEntryPoint)
                    .accessDeniedHandler(restAccessDeniedHandler))
            .authorizeHttpRequests(auth -> {
                if (securityEnabled) {
                    auth.requestMatchers(
                                "/actuator/health", "/swagger-ui/**", "/api-docs/**",
                                "/api/auth/register", "/api/auth/login", "/api/auth/refresh",
                                "/api/auth/registration-status")
                            .permitAll()
                        .anyRequest().authenticated();
                } else {
                    auth.anyRequest().permitAll();
                }
            })
            .httpBasic(basic -> basic.disable())
            .formLogin(form -> form.disable());

        if (securityEnabled) {
            http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        }

        return http.build();
    }

    @Bean
    public org.springframework.boot.web.servlet.FilterRegistrationBean<JwtAuthenticationFilter> disableAutoFilterRegistration(
            JwtAuthenticationFilter filter) {
        // JwtAuthenticationFilter is a @Component so Spring Security can
        // inject it above via constructor DI, but that also makes Spring
        // Boot want to auto-register it as a standalone servlet filter
        // applied to every request — running it a second time, outside the
        // Security chain. This registration exists purely to switch that
        // auto-registration off; addFilterBefore() above is the only place
        // this filter actually runs.
        var registration = new org.springframework.boot.web.servlet.FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        // Required for the refresh-token cookie to travel on cross-origin
        // calls to the API during local dev (frontend on :5173, backend on
        // :8080). In the standard same-origin Nginx deployment this is moot.
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}
