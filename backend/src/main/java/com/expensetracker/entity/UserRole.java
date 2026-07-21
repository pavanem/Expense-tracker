package com.expensetracker.entity;

/**
 * Single-user self-hosted app today, but modeled as a real role from day
 * one so multi-user support (SRS roadmap) doesn't require a migration.
 */
public enum UserRole {
    USER,
    ADMIN
}
