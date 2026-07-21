package com.expensetracker.service;

import com.expensetracker.dto.ReportFilterRequest;
import com.expensetracker.entity.Category;
import com.expensetracker.entity.Expense;
import com.expensetracker.entity.PaymentMode;
import com.expensetracker.repository.ExpenseRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CsvExportServiceTest {

    @Mock private ExpenseRepository expenseRepository;

    private final ReportService reportService = new ReportService(mock());

    private static ExpenseRepository mock() {
        return org.mockito.Mockito.mock(ExpenseRepository.class);
    }

    private final Category food = Category.builder().id(1L).name("Food").color("#FF7043").build();

    @Test
    void export_entireDatabase_usesFixedFilename() {
        when(expenseRepository.findAll(any(Sort.class))).thenReturn(List.of());

        CsvExportService service = new CsvExportService(expenseRepository, reportService);
        CsvExportService.CsvExport export = service.export(ReportFilterRequest.builder().build(), true);

        assertThat(export.filename()).isEqualTo("expenses_all.csv");
    }

    @Test
    void export_monthlyFilter_producesSrsMatchingFilename() {
        when(expenseRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of());

        CsvExportService service = new CsvExportService(expenseRepository, reportService);
        ReportFilterRequest filter = ReportFilterRequest.builder().month(7).year(2026).build();
        CsvExportService.CsvExport export = service.export(filter, false);

        assertThat(export.filename()).isEqualTo("expenses_2026_07.csv");
    }

    @Test
    void export_yearlyFilter_producesSrsMatchingFilename() {
        when(expenseRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of());

        CsvExportService service = new CsvExportService(expenseRepository, reportService);
        ReportFilterRequest filter = ReportFilterRequest.builder().year(2026).build();
        CsvExportService.CsvExport export = service.export(filter, false);

        assertThat(export.filename()).isEqualTo("expenses_2026.csv");
    }

    @Test
    void export_dateRangeFilter_producesSrsMatchingFilename() {
        when(expenseRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of());

        CsvExportService service = new CsvExportService(expenseRepository, reportService);
        ReportFilterRequest filter = ReportFilterRequest.builder()
                .startDate(LocalDate.of(2026, 7, 10))
                .endDate(LocalDate.of(2026, 7, 20))
                .build();
        CsvExportService.CsvExport export = service.export(filter, false);

        assertThat(export.filename()).isEqualTo("expenses_2026_07_10_to_2026_07_20.csv");
    }

    @Test
    void export_writesCsvHeaderAndRows() {
        Expense expense = Expense.builder()
                .amount(new BigDecimal("199.99"))
                .category(food)
                .merchant("Cafe")
                .description("Lunch")
                .paymentMode(PaymentMode.UPI)
                .expenseDate(LocalDate.of(2026, 7, 10))
                .build();

        when(expenseRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(expense));

        CsvExportService service = new CsvExportService(expenseRepository, reportService);
        ReportFilterRequest filter = ReportFilterRequest.builder().date(LocalDate.of(2026, 7, 10)).build();
        CsvExportService.CsvExport export = service.export(filter, false);

        assertThat(export.content()).contains("Date,Category,Merchant,Description,Payment Mode,Amount");
        assertThat(export.content()).contains("2026-07-10,Food,Cafe,Lunch,UPI,199.99");
        assertThat(export.filename()).isEqualTo("expenses_2026_07_10.csv");
    }
}
