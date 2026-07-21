package com.expensetracker.service;

import com.expensetracker.dto.ReportFilterRequest;
import com.expensetracker.dto.ReportResponse;
import com.expensetracker.entity.Category;
import com.expensetracker.entity.Expense;
import com.expensetracker.entity.PaymentMode;
import com.expensetracker.exception.InvalidRequestException;
import com.expensetracker.repository.ExpenseRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock
    private ExpenseRepository expenseRepository;

    @InjectMocks
    private ReportService reportService;

    private Category food = Category.builder().id(1L).name("Food").color("#FF7043").build();
    private Category travel = Category.builder().id(2L).name("Travel").color("#29B6F6").build();

    @Test
    void resolveWindow_specificDate_takesTopPrecedence() {
        ReportFilterRequest filter = ReportFilterRequest.builder()
                .date(LocalDate.of(2026, 7, 10))
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 12, 31))
                .build();

        ReportService.DateWindow window = reportService.resolveWindow(filter);

        assertThat(window.start()).isEqualTo(LocalDate.of(2026, 7, 10));
        assertThat(window.end()).isEqualTo(LocalDate.of(2026, 7, 10));
    }

    @Test
    void resolveWindow_dateRange_requiresBothBounds() {
        ReportFilterRequest filter = ReportFilterRequest.builder().startDate(LocalDate.now()).build();

        assertThatThrownBy(() -> reportService.resolveWindow(filter))
                .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void resolveWindow_dateRange_rejectsStartAfterEnd() {
        ReportFilterRequest filter = ReportFilterRequest.builder()
                .startDate(LocalDate.of(2026, 7, 20))
                .endDate(LocalDate.of(2026, 7, 10))
                .build();

        assertThatThrownBy(() -> reportService.resolveWindow(filter))
                .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void resolveWindow_monthAndYear_resolvesToCalendarMonth() {
        ReportFilterRequest filter = ReportFilterRequest.builder().month(2).year(2024).build(); // leap year

        ReportService.DateWindow window = reportService.resolveWindow(filter);

        assertThat(window.start()).isEqualTo(LocalDate.of(2024, 2, 1));
        assertThat(window.end()).isEqualTo(LocalDate.of(2024, 2, 29));
    }

    @Test
    void resolveWindow_yearOnly_resolvesToFullYear() {
        ReportFilterRequest filter = ReportFilterRequest.builder().year(2025).build();

        ReportService.DateWindow window = reportService.resolveWindow(filter);

        assertThat(window.start()).isEqualTo(LocalDate.of(2025, 1, 1));
        assertThat(window.end()).isEqualTo(LocalDate.of(2025, 12, 31));
    }

    @Test
    void generate_computesTotalsAndBreakdowns() {
        LocalDate day1 = LocalDate.of(2026, 7, 1);
        LocalDate day2 = LocalDate.of(2026, 7, 2);

        Expense e1 = Expense.builder().category(food).amount(new BigDecimal("100.00")).expenseDate(day1)
                .paymentMode(PaymentMode.UPI).build();
        Expense e2 = Expense.builder().category(travel).amount(new BigDecimal("300.00")).expenseDate(day2)
                .paymentMode(PaymentMode.CREDIT_CARD).build();

        when(expenseRepository.findAll(any(Specification.class))).thenReturn(List.of(e1, e2));

        ReportFilterRequest filter = ReportFilterRequest.builder().startDate(day1).endDate(day2).build();
        ReportResponse report = reportService.generate(filter);

        assertThat(report.getTotalExpenses()).isEqualByComparingTo("400.00");
        assertThat(report.getNumberOfTransactions()).isEqualTo(2);
        assertThat(report.getHighestExpense()).isEqualByComparingTo("300.00");
        assertThat(report.getLowestExpense()).isEqualByComparingTo("100.00");
        assertThat(report.getAverageDailySpending()).isEqualByComparingTo("200.00");
        assertThat(report.getCategoryBreakdown()).hasSize(2);
        assertThat(report.getCategoryBreakdown().get(0).getCategoryName()).isEqualTo("Travel"); // highest first
        assertThat(report.getDailyBreakdown()).hasSize(2);
    }

    @Test
    void generate_returnsZeroedReport_whenNoExpensesMatch() {
        when(expenseRepository.findAll(any(Specification.class))).thenReturn(List.of());

        ReportFilterRequest filter = ReportFilterRequest.builder()
                .startDate(LocalDate.of(2026, 1, 1)).endDate(LocalDate.of(2026, 1, 31)).build();
        ReportResponse report = reportService.generate(filter);

        assertThat(report.getTotalExpenses()).isEqualByComparingTo("0");
        assertThat(report.getNumberOfTransactions()).isZero();
        assertThat(report.getCategoryBreakdown()).isEmpty();
    }
}
