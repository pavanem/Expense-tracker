package com.expensetracker.repository;

import com.expensetracker.entity.Income;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;

public final class IncomeSpecifications {

    private IncomeSpecifications() {
    }

    public static Specification<Income> userIdEquals(Long userId) {
        return (root, query, cb) -> userId == null ? null : cb.equal(root.get("user").get("id"), userId);
    }

    public static Specification<Income> categoryIdEquals(Long categoryId) {
        return (root, query, cb) -> categoryId == null ? null : cb.equal(root.get("incomeCategory").get("id"), categoryId);
    }

    public static Specification<Income> sourceContains(String source) {
        return (root, query, cb) -> (source == null || source.isBlank())
                ? null
                : cb.like(cb.lower(root.get("source")), "%" + source.toLowerCase() + "%");
    }

    public static Specification<Income> dateBetween(LocalDate start, LocalDate end) {
        return (root, query, cb) -> {
            if (start != null && end != null) {
                return cb.between(root.get("incomeDate"), start, end);
            } else if (start != null) {
                return cb.greaterThanOrEqualTo(root.get("incomeDate"), start);
            } else if (end != null) {
                return cb.lessThanOrEqualTo(root.get("incomeDate"), end);
            }
            return null;
        };
    }

    public static Specification<Income> amountBetween(BigDecimal min, BigDecimal max) {
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

    public static Specification<Income> keywordSearch(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) {
                return null;
            }
            String like = "%" + keyword.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("incomeCategory").get("name")), like),
                    cb.like(cb.lower(cb.coalesce(root.get("source"), "")), like),
                    cb.like(cb.lower(cb.coalesce(root.get("description"), "")), like),
                    cb.like(root.get("amount").as(String.class), like)
            );
        };
    }
}
