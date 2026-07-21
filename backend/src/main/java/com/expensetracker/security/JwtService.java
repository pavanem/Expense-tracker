package com.expensetracker.security;

import com.expensetracker.config.JwtProperties;
import com.expensetracker.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

/**
 * Issues and verifies the short-lived (default 15 min) JWT access token that
 * the frontend sends on every API call. The long-lived refresh token is
 * deliberately NOT a JWT — see TokenHasher / AuthService — so this class
 * only ever deals with the access token.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class JwtService {

    private static final String CLAIM_USER_ID = "uid";
    private static final String CLAIM_ROLE = "role";
    private static final int MIN_SECRET_BYTES_FOR_HS256 = 32; // 256 bits
    private static final String SHIPPED_PLACEHOLDER_SECRET =
            "CHANGE_ME_INSECURE_DEFAULT_DO_NOT_USE_IN_PRODUCTION_1234567890";

    private final JwtProperties jwtProperties;

    @Value("${app.security.enabled:false}")
    private boolean securityEnabled;

    private SecretKey signingKey;

    @PostConstruct
    void init() {
        byte[] secretBytes = jwtProperties.secret() == null
                ? new byte[0]
                : jwtProperties.secret().getBytes(StandardCharsets.UTF_8);

        if (secretBytes.length < MIN_SECRET_BYTES_FOR_HS256) {
            // Fails fast at startup rather than issuing weakly-signed tokens.
            // In dev/test this is easy to hit accidentally — the message
            // tells you exactly how to fix it.
            throw new IllegalStateException(
                    "app.jwt.secret is missing or too short for HS256 (needs >= 32 bytes / 256 bits). "
                            + "Generate one with: openssl rand -base64 64, then set JWT_SECRET.");
        }

        if (securityEnabled && SHIPPED_PLACEHOLDER_SECRET.equals(jwtProperties.secret())) {
            // The placeholder is long enough to pass the length check above,
            // so it needs its own explicit check — otherwise a deployment
            // could go live signing every token with a secret published in
            // this project's own source code.
            throw new IllegalStateException(
                    "app.security.enabled=true but JWT_SECRET is still the placeholder from .env.example. "
                            + "Generate a real one with: openssl rand -base64 64, then set JWT_SECRET.");
        }
        this.signingKey = Keys.hmacShaKeyFor(secretBytes);
    }

    public String generateAccessToken(User user) {
        Instant now = Instant.now();
        Instant expiry = now.plus(jwtProperties.accessTokenExpiryMinutes(), ChronoUnit.MINUTES);

        return Jwts.builder()
                .subject(user.getUsername())
                .claim(CLAIM_USER_ID, user.getId())
                .claim(CLAIM_ROLE, user.getRole().name())
                .issuer(jwtProperties.issuer())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(signingKey)
                .compact();
    }

    public long accessTokenExpirySeconds() {
        return jwtProperties.accessTokenExpiryMinutes() * 60;
    }

    /**
     * Parses and fully validates (signature + expiry + issuer) an access
     * token. Throws JwtException (or a subclass) on any failure — callers
     * treat any exception here as "unauthenticated", never inspecting the
     * specific cause in a way that would leak validation internals to the
     * client.
     */
    public Claims parseAndValidate(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .requireIssuer(jwtProperties.issuer())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isExpired(JwtException exceptionFromParsing) {
        return exceptionFromParsing instanceof ExpiredJwtException;
    }

    public Long extractUserId(Claims claims) {
        return claims.get(CLAIM_USER_ID, Long.class);
    }

    public String extractRole(Claims claims) {
        return claims.get(CLAIM_ROLE, String.class);
    }
}
