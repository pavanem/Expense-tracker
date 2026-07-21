package com.expensetracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {
    private BigDecimal todayTotal;
    private BigDecimal currentMonthTotal;
    private BigDecimal currentYearTotal;
    private List<ExpenseResponse> recentExpenses;
    private List<CategoryTotal> topSpendingCategories;
    private List<MonthlyPoint> monthlyExpenseSummary;

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryTotal {
        private Long categoryId;
        private String categoryName;
        private String categoryColor;
        private BigDecimal total;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyPoint {
        private String month; // yyyy-MM
        private BigDecimal total;
    }
}
