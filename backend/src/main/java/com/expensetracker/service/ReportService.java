package com.expensetracker.service;

import com.expensetracker.dto.DashboardResponse;
import com.expensetracker.dto.ReportFilterRequest;
import com.expensetracker.dto.ReportResponse;
import com.expensetracker.entity.Expense;
import com.expensetracker.exception.InvalidRequestException;
import com.expensetracker.repository.ExpenseRepository;
import com.expensetracker.repository.ExpenseSpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

/**
 * Resolves the SRS report filter options (specific date, date range, monthly,
 * yearly, category, payment mode, merchant) into a concrete [start, end]
 * window plus optional dimension filters, then computes every metric the
 * SRS asks reports to display.
 *
 * Precedence when multiple date-shaped filters are supplied: specific date >
 * explicit date range > month+year > year only > all-time.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

    private final ExpenseRepository expenseRepository;

    public ReportResponse generate(ReportFilterRequest filter) {
        DateWindow window = resolveWindow(filter);

        Specification<Expense> spec = Specification
                .where(ExpenseSpecifications.dateBetween(window.start(), window.end()))
                .and(ExpenseSpecifications.categoryIdEquals(filter.getCategoryId()))
                .and(ExpenseSpecifications.paymentModeEquals(filter.getPaymentMode()))
                .and(ExpenseSpecifications.merchantContains(filter.getMerchant()));

        List<Expense> expenses = expenseRepository.findAll(spec);

        BigDecimal total = expenses.stream().map(Expense::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        long count = expenses.size();

        BigDecimal highest = expenses.stream().map(Expense::getAmount).max(Comparator.naturalOrder()).orElse(BigDecimal.ZERO);
        BigDecimal lowest = expenses.stream().map(Expense::getAmount).min(Comparator.naturalOrder()).orElse(BigDecimal.ZERO);

        long daySpan = Math.max(1, ChronoUnit.DAYS.between(window.start(), window.end()) + 1);
        BigDecimal avgDaily = count == 0
                ? BigDecimal.ZERO
                : total.divide(BigDecimal.valueOf(daySpan), 2, RoundingMode.HALF_UP);

        List<DashboardResponse.CategoryTotal> categoryBreakdown = expenses.stream()
                .collect(Collectors.groupingBy(e -> e.getCategory().getId(),
                        Collectors.reducing(BigDecimal.ZERO, Expense::getAmount, BigDecimal::add)))
                .entrySet().stream()
                .map(entry -> {
                    Expense sample = expenses.stream()
                            .filter(e -> e.getCategory().getId().equals(entry.getKey()))
                            .findFirst().orElseThrow();
                    return DashboardResponse.CategoryTotal.builder()
                            .categoryId(entry.getKey())
                            .categoryName(sample.getCategory().getName())
                            .categoryColor(sample.getCategory().getColor())
                            .total(entry.getValue())
                            .build();
                })
                .sorted(Comparator.comparing(DashboardResponse.CategoryTotal::getTotal).reversed())
                .toList();

        Map<LocalDate, BigDecimal> dailyMap = new TreeMap<>(expenses.stream()
                .collect(Collectors.groupingBy(Expense::getExpenseDate,
                        Collectors.reducing(BigDecimal.ZERO, Expense::getAmount, BigDecimal::add))));
        List<ReportResponse.DailyPoint> dailyBreakdown = dailyMap.entrySet().stream()
                .map(e -> ReportResponse.DailyPoint.builder().date(e.getKey()).total(e.getValue()).build())
                .toList();

        Map<YearMonth, BigDecimal> monthlyMap = new TreeMap<>(expenses.stream()
                .collect(Collectors.groupingBy(e -> YearMonth.from(e.getExpenseDate()),
                        Collectors.reducing(BigDecimal.ZERO, Expense::getAmount, BigDecimal::add))));
        List<DashboardResponse.MonthlyPoint> monthlyBreakdown = monthlyMap.entrySet().stream()
                .map(e -> DashboardResponse.MonthlyPoint.builder().month(e.getKey().toString()).total(e.getValue()).build())
                .toList();

        Map<Integer, BigDecimal> yearlyMap = new TreeMap<>(expenses.stream()
                .collect(Collectors.groupingBy(e -> e.getExpenseDate().getYear(),
                        Collectors.reducing(BigDecimal.ZERO, Expense::getAmount, BigDecimal::add))));
        List<ReportResponse.YearlyPoint> yearlyBreakdown = yearlyMap.entrySet().stream()
                .map(e -> ReportResponse.YearlyPoint.builder().year(e.getKey()).total(e.getValue()).build())
                .toList();

        return ReportResponse.builder()
                .startDate(window.start())
                .endDate(window.end())
                .totalExpenses(total)
                .numberOfTransactions(count)
                .averageDailySpending(avgDaily)
                .highestExpense(highest)
                .lowestExpense(lowest)
                .categoryBreakdown(categoryBreakdown)
                .dailyBreakdown(dailyBreakdown)
                .monthlyBreakdown(monthlyBreakdown)
                .yearlyBreakdown(yearlyBreakdown)
                .build();
    }

    /** Resolves the raw filter into a concrete inclusive date window. Package-private for reuse by CsvExportService. */
    DateWindow resolveWindow(ReportFilterRequest filter) {
        if (filter.getDate() != null) {
            return new DateWindow(filter.getDate(), filter.getDate());
        }
        if (filter.getStartDate() != null || filter.getEndDate() != null) {
            LocalDate start = filter.getStartDate();
            LocalDate end = filter.getEndDate();
            if (start == null || end == null) {
                throw new InvalidRequestException("Both startDate and endDate are required for a date range report");
            }
            if (start.isAfter(end)) {
                throw new InvalidRequestException("startDate must not be after endDate");
            }
            return new DateWindow(start, end);
        }
        if (filter.getMonth() != null) {
            int year = filter.getYear() != null ? filter.getYear() : LocalDate.now().getYear();
            if (filter.getMonth() < 1 || filter.getMonth() > 12) {
                throw new InvalidRequestException("month must be between 1 and 12");
            }
            YearMonth ym = YearMonth.of(year, filter.getMonth());
            return new DateWindow(ym.atDay(1), ym.atEndOfMonth());
        }
        if (filter.getYear() != null) {
            LocalDate start = LocalDate.of(filter.getYear(), 1, 1);
            LocalDate end = LocalDate.of(filter.getYear(), 12, 31);
            return new DateWindow(start, end);
        }
        // No date filter supplied: default to earliest possible -> today (all-time).
        LocalDate earliest = expenseRepository.findAll().stream()
                .map(Expense::getExpenseDate)
                .min(Comparator.naturalOrder())
                .orElse(LocalDate.now());
        return new DateWindow(earliest, LocalDate.now());
    }

    record DateWindow(LocalDate start, LocalDate end) {
    }
}
