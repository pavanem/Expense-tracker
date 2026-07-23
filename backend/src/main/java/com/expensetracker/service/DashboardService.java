package com.expensetracker.service;

import com.expensetracker.dto.DashboardResponse;
import com.expensetracker.entity.Expense;
import com.expensetracker.mapper.ExpenseMapper;
import com.expensetracker.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private static final int RECENT_EXPENSES_LIMIT = 10;
    private static final int TOP_CATEGORIES_LIMIT = 5;
    private static final int MONTHLY_SUMMARY_MONTHS = 6;
    private static final DateTimeFormatter MONTH_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM");

    private final ExpenseRepository expenseRepository;
    private final ExpenseMapper expenseMapper;

    public DashboardResponse getDashboard(Long userId) {
        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);
        LocalDate monthEnd = monthStart.plusMonths(1).minusDays(1);
        LocalDate yearStart = today.withDayOfYear(1);
        LocalDate yearEnd = yearStart.plusYears(1).minusDays(1);

        BigDecimal todayTotal = expenseRepository.sumAmountByDate(today, userId);
        BigDecimal monthTotal = expenseRepository.sumAmountBetween(monthStart, monthEnd, userId);
        BigDecimal yearTotal = expenseRepository.sumAmountBetween(yearStart, yearEnd, userId);

        List<Expense> recent = expenseRepository.findRecent(
                PageRequest.of(0, RECENT_EXPENSES_LIMIT), userId);

        List<com.expensetracker.dto.ExpenseResponse> recentExpenses = recent.stream()
                .map(expenseMapper::toResponse)
                .toList();

        List<DashboardResponse.CategoryTotal> topCategories = expenseRepository
                .sumAmountByCategoryBetween(monthStart, monthEnd, userId).stream()
                .limit(TOP_CATEGORIES_LIMIT)
                .map(row -> DashboardResponse.CategoryTotal.builder()
                        .categoryId((Long) row[0])
                        .categoryName((String) row[1])
                        .categoryColor((String) row[2])
                        .total((BigDecimal) row[3])
                        .build())
                .toList();

        LocalDate summaryStart = YearMonth.from(today).minusMonths(MONTHLY_SUMMARY_MONTHS - 1L).atDay(1);
        List<DashboardResponse.MonthlyPoint> monthlySummary = expenseRepository
                .sumAmountByMonthBetween(summaryStart, monthEnd, userId).stream()
                .map(row -> DashboardResponse.MonthlyPoint.builder()
                        .month(formatMonth(row[0]))
                        .total((BigDecimal) row[1])
                        .build())
                .toList();

        return DashboardResponse.builder()
                .todayTotal(todayTotal)
                .currentMonthTotal(monthTotal)
                .currentYearTotal(yearTotal)
                .recentExpenses(recentExpenses)
                .topSpendingCategories(topCategories)
                .monthlyExpenseSummary(monthlySummary)
                .build();
    }

    private String formatMonth(Object dbValue) {
        if (dbValue instanceof java.sql.Timestamp ts) {
            return ts.toLocalDateTime().toLocalDate().format(MONTH_FORMAT);
        }
        if (dbValue instanceof java.sql.Date d) {
            return d.toLocalDate().format(MONTH_FORMAT);
        }
        if (dbValue instanceof LocalDate ld) {
            return ld.format(MONTH_FORMAT);
        }
        return String.valueOf(dbValue);
    }
}
