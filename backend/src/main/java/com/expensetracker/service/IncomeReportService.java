package com.expensetracker.service;

import com.expensetracker.dto.DashboardResponse;
import com.expensetracker.dto.ReportFilterRequest;
import com.expensetracker.dto.ReportResponse;
import com.expensetracker.entity.Income;
import com.expensetracker.exception.InvalidRequestException;
import com.expensetracker.repository.IncomeRepository;
import com.expensetracker.repository.IncomeSpecifications;
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

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class IncomeReportService {

    private final IncomeRepository incomeRepository;

    public ReportResponse generate(ReportFilterRequest filter, Long userId) {
        DateWindow window = resolveWindow(filter, userId);

        Specification<Income> spec = Specification
                .where(IncomeSpecifications.userIdEquals(userId))
                .and(IncomeSpecifications.dateBetween(window.start(), window.end()))
                .and(IncomeSpecifications.categoryIdEquals(filter.getCategoryId()))
                .and(IncomeSpecifications.sourceContains(filter.getMerchant()));

        List<Income> incomes = incomeRepository.findAll(spec);

        BigDecimal total = incomes.stream().map(Income::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        long count = incomes.size();

        BigDecimal highest = incomes.stream().map(Income::getAmount).max(Comparator.naturalOrder()).orElse(BigDecimal.ZERO);
        BigDecimal lowest = incomes.stream().map(Income::getAmount).min(Comparator.naturalOrder()).orElse(BigDecimal.ZERO);

        long daySpan = Math.max(1, ChronoUnit.DAYS.between(window.start(), window.end()) + 1);
        BigDecimal avgDaily = count == 0
                ? BigDecimal.ZERO
                : total.divide(BigDecimal.valueOf(daySpan), 2, RoundingMode.HALF_UP);

        List<DashboardResponse.CategoryTotal> categoryBreakdown = incomes.stream()
                .collect(Collectors.groupingBy(i -> i.getIncomeCategory().getId(),
                        Collectors.reducing(BigDecimal.ZERO, Income::getAmount, BigDecimal::add)))
                .entrySet().stream()
                .map(entry -> {
                    Income sample = incomes.stream()
                            .filter(i -> i.getIncomeCategory().getId().equals(entry.getKey()))
                            .findFirst().orElseThrow();
                    return DashboardResponse.CategoryTotal.builder()
                            .categoryId(entry.getKey())
                            .categoryName(sample.getIncomeCategory().getName())
                            .categoryColor(sample.getIncomeCategory().getColor())
                            .total(entry.getValue())
                            .build();
                })
                .sorted(Comparator.comparing(DashboardResponse.CategoryTotal::getTotal).reversed())
                .toList();

        Map<LocalDate, BigDecimal> dailyMap = new TreeMap<>(incomes.stream()
                .collect(Collectors.groupingBy(Income::getIncomeDate,
                        Collectors.reducing(BigDecimal.ZERO, Income::getAmount, BigDecimal::add))));
        List<ReportResponse.DailyPoint> dailyBreakdown = dailyMap.entrySet().stream()
                .map(e -> ReportResponse.DailyPoint.builder().date(e.getKey()).total(e.getValue()).build())
                .toList();

        Map<YearMonth, BigDecimal> monthlyMap = new TreeMap<>(incomes.stream()
                .collect(Collectors.groupingBy(i -> YearMonth.from(i.getIncomeDate()),
                        Collectors.reducing(BigDecimal.ZERO, Income::getAmount, BigDecimal::add))));
        List<DashboardResponse.MonthlyPoint> monthlyBreakdown = monthlyMap.entrySet().stream()
                .map(e -> DashboardResponse.MonthlyPoint.builder().month(e.getKey().toString()).total(e.getValue()).build())
                .toList();

        Map<Integer, BigDecimal> yearlyMap = new TreeMap<>(incomes.stream()
                .collect(Collectors.groupingBy(i -> i.getIncomeDate().getYear(),
                        Collectors.reducing(BigDecimal.ZERO, Income::getAmount, BigDecimal::add))));
        List<ReportResponse.YearlyPoint> yearlyBreakdown = yearlyMap.entrySet().stream()
                .map(e -> ReportResponse.YearlyPoint.builder().year(e.getKey()).total(e.getValue()).build())
                .toList();

        return ReportResponse.builder()
                .startDate(window.start())
                .endDate(window.end())
                .totalExpenses(total) // mapped as total for report structure
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

    DateWindow resolveWindow(ReportFilterRequest filter, Long userId) {
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
        LocalDate earliest = incomeRepository.findEarliestDateByUser(userId)
                .orElse(LocalDate.now());
        return new DateWindow(earliest, LocalDate.now());
    }

    public record DateWindow(LocalDate start, LocalDate end) {
    }
}
