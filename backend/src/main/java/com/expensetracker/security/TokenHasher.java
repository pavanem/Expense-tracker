package com.expensetracker.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Refresh tokens are opaque random strings (not JWTs) — they're validated
 * by a server-side DB lookup rather than signature verification, which is
 * the more common enterprise pattern for long-lived, revocable tokens.
 * Only their SHA-256 hash is ever persisted, exactly like a password hash,
 * so a database leak alone can't be replayed as a valid session.
 */
public final class TokenHasher {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int RAW_TOKEN_BYTES = 32; // 256 bits of entropy

    private TokenHasher() {
    }

    public static String generateRawToken() {
        byte[] bytes = new byte[RAW_TOKEN_BYTES];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public static String sha256Hex(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is guaranteed present on every JDK; this is unreachable in practice.
            throw new IllegalStateException("SHA-256 algorithm unavailable", e);
        }
    }
}
