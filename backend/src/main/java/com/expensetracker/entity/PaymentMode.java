package com.expensetracker.entity;

/**
 * Supported payment modes for an expense.
 * NOTE: modeled as an enum for v1; the SRS calls for dynamic management of
 * payment modes in the future. When that is implemented, this should be
 * migrated to a lookup table (similar to Category) without breaking the
 * existing expense.payment_mode column (a simple data migration + FK swap).
 */
public enum PaymentMode {
    CASH,
    UPI,
    CREDIT_CARD,
    DEBIT_CARD,
    NET_BANKING,
    WALLET,
    OTHER
}
