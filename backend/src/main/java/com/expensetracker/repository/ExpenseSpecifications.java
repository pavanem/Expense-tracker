package com.expensetracker.repository;

import com.expensetracker.entity.Expense;
import com.expensetracker.entity.PaymentMode;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Composable Specification builders used by ExpenseService to translate
 * search/filter query params into a single dynamic query, avoiding N
 * hand-written repository finder methods for every filter combination.
 */
public final class ExpenseSpecifications {

    private ExpenseSpecifications() {
    }

    /**
     * Restricts results to expenses owned by the given user.
     * Every query that touches expenses must include this spec.
     */
    public static Specification<Expense> userIdEquals(Long userId) {
        return (root, query, cb) -> userId == null ? null : cb.equal(root.get("user").get("id"), userId);
    }

    public static Specification<Expense> categoryIdEquals(Long categoryId) {
        return (root, query, cb) -> categoryId == null ? null : cb.equal(root.get("category").get("id"), categoryId);
    }

    public static Specification<Expense> paymentModeEquals(PaymentMode paymentMode) {
        return (root, query, cb) -> paymentMode == null ? null : cb.equal(root.get("paymentMode"), paymentMode);
    }

    public static Specification<Expense> merchantContains(String merchant) {
        return (root, query, cb) -> (merchant == null || merchant.isBlank())
                ? null
                : cb.like(cb.lower(root.get("merchant")), "%" + merchant.toLowerCase() + "%");
    }

    public static Specification<Expense> dateBetween(LocalDate start, LocalDate end) {
        return (root, query, cb) -> {
            if (start != null && end != null) {
                return cb.between(root.get("expenseDate"), start, end);
            } else if (start != null) {
                return cb.greaterThanOrEqualTo(root.get("expenseDate"), start);
            } else if (end != null) {
                return cb.lessThanOrEqualTo(root.get("expenseDate"), end);
            }
            return null;
        };
    }

    public static Specification<Expense> amountBetween(BigDecimal min, BigDecimal max) {
        return (root, query, cb) -> {
            if (min != null && max != null) {
                return cb.between(root.get("amount"), min, max);
            } else if (min != null) {
                return cb.greaterThanOrEqualTo(root.get("amount"), min);
            } else if (max != null) {
                return cb.lessThanOrEqualTo(root.get("amount"), max);
            }
            return null;
        };
    }

    /**
     * Free-text search across category name, merchant, description, payment mode,
     * and amount (as string).
     */
    public static Specification<Expense> keywordSearch(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) {
                return null;
            }
            String like = "%" + keyword.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("category").get("name")), like),
                    cb.like(cb.lower(cb.coalesce(root.get("merchant"), "")), like),
                    cb.like(cb.lower(cb.coalesce(root.get("description"), "")), like),
                    cb.like(cb.lower(root.get("paymentMode").as(String.class)), like),
                    cb.like(root.get("amount").as(String.class), like)
            );
        };
    }
}
