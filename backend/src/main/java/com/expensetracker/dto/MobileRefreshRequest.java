package com.expensetracker.dto;

/**
 * Used by native mobile clients (Android/iOS) that cannot rely on the
 * browser httpOnly cookie mechanism. The mobile app stores the refresh
 * token in the OS secure store (Android Keystore / iOS Keychain) and
 * sends it here explicitly.
 *
 * Web clients continue to use the cookie path — this body field is only
 * read when no cookie is present, so the existing web flow is unchanged.
 */
public record MobileRefreshRequest(String refreshToken) {
}
