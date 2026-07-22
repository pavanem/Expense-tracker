package com.expensetracker.service;

import com.expensetracker.dto.DashboardResponse;
import com.expensetracker.entity.Category;
import com.expensetracker.entity.Expense;
import com.expensetracker.entity.PaymentMode;
import com.expensetracker.mapper.ExpenseMapper;
import com.expensetracker.repository.ExpenseRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock private ExpenseRepository expenseRepository;
    @Mock private ExpenseMapper expenseMapper;

    private DashboardService dashboardService;

    private final Category food = Category.builder().id(1L).name("Food").color("#FF7043").build();

    @Test
    void getDashboard_assemblesAllSectionsFromRepositoryAggregates() {
        dashboardService = new DashboardService(expenseRepository, expenseMapper);

        when(expenseRepository.sumAmountByDate(any(LocalDate.class))).thenReturn(new BigDecimal("120.00"));
        when(expenseRepository.sumAmountBetween(any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(new BigDecimal("2500.00"));

        Expense recentExpense = Expense.builder().id(1L).category(food).amount(new BigDecimal("120.00"))
                .paymentMode(PaymentMode.UPI).expenseDate(LocalDate.now()).build();
        when(expenseRepository.findRecent(any(Pageable.class))).thenReturn(List.of(recentExpense));
        when(expenseMapper.toResponse(recentExpense)).thenReturn(
                com.expensetracker.dto.ExpenseResponse.builder().id(1L).amount(new BigDecimal("120.00")).build());

        // Object[] shape matches ExpenseRepository#sumAmountByCategoryBetween: [id, name, color, total]
        Object[] categoryRow = new Object[]{1L, "Food", "#FF7043", new BigDecimal("2500.00")};
        when(expenseRepository.sumAmountByCategoryBetween(any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.<Object[]>of(categoryRow));

        // Object[] shape matches #sumAmountByMonthBetween: [truncated-date, total]
        Object[] monthRow = new Object[]{Date.valueOf(LocalDate.now().withDayOfMonth(1)), new BigDecimal("2500.00")};
        when(expenseRepository.sumAmountByMonthBetween(any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.<Object[]>of(monthRow));

        DashboardResponse dashboard = dashboardService.getDashboard();

        assertThat(dashboard.getTodayTotal()).isEqualByComparingTo("120.00");
        assertThat(dashboard.getCurrentMonthTotal()).isEqualByComparingTo("2500.00");
        assertThat(dashboard.getCurrentYearTotal()).isEqualByComparingTo("2500.00");
        assertThat(dashboard.getRecentExpenses()).hasSize(1);
        assertThat(dashboard.getTopSpendingCategories()).hasSize(1);
        assertThat(dashboard.getTopSpendingCategories().get(0).getCategoryName()).isEqualTo("Food");
        assertThat(dashboard.getMonthlyExpenseSummary()).hasSize(1);
        assertThat(dashboard.getMonthlyExpenseSummary().get(0).getTotal()).isEqualByComparingTo("2500.00");
    }

    @Test
    void getDashboard_topCategoriesLimitedToFive() {
        dashboardService = new DashboardService(expenseRepository, expenseMapper);

        when(expenseRepository.sumAmountByDate(any(LocalDate.class))).thenReturn(BigDecimal.ZERO);
        when(expenseRepository.sumAmountBetween(any(LocalDate.class), any(LocalDate.class))).thenReturn(BigDecimal.ZERO);
        when(expenseRepository.findRecent(any(Pageable.class))).thenReturn(List.of());
        when(expenseRepository.sumAmountByMonthBetween(any(LocalDate.class), any(LocalDate.class))).thenReturn(List.of());

        List<Object[]> sevenCategories = List.of(
                new Object[]{1L, "A", "#111", new BigDecimal("700")},
                new Object[]{2L, "B", "#222", new BigDecimal("600")},
                new Object[]{3L, "C", "#333", new BigDecimal("500")},
                new Object[]{4L, "D", "#444", new BigDecimal("400")},
                new Object[]{5L, "E", "#555", new BigDecimal("300")},
                new Object[]{6L, "F", "#666", new BigDecimal("200")},
                new Object[]{7L, "G", "#777", new BigDecimal("100")}
        );
        when(expenseRepository.sumAmountByCategoryBetween(any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(sevenCategories);

        DashboardResponse dashboard = dashboardService.getDashboard();

        assertThat(dashboard.getTopSpendingCategories()).hasSize(5);
    }
}
