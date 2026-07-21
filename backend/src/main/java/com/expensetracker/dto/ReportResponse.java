package com.expensetracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportResponse {
    private LocalDate startDate;
    private LocalDate endDate;

    private BigDecimal totalExpenses;
    private long numberOfTransactions;
    private BigDecimal averageDailySpending;
    private BigDecimal highestExpense;
    private BigDecimal lowestExpense;

    private List<DashboardResponse.CategoryTotal> categoryBreakdown;
    private List<DailyPoint> dailyBreakdown;
    private List<DashboardResponse.MonthlyPoint> monthlyBreakdown;
    private List<YearlyPoint> yearlyBreakdown;

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyPoint {
        private LocalDate date;
        private BigDecimal total;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class YearlyPoint {
        private int year;
        private BigDecimal total;
    }
}
