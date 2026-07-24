package com.expensetracker.service;

import com.expensetracker.dto.ReportFilterRequest;
import com.expensetracker.entity.Expense;
import com.expensetracker.repository.ExpenseRepository;
import com.expensetracker.repository.ExpenseSpecifications;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.StringWriter;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Builds CSV exports scoped to the requesting user.
 * "Entire database" mode exports all of the user's own expenses, not other users' data.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CsvExportService {

    private static final DateTimeFormatter CSV_DATE_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final String[] HEADERS = {"Date", "Category", "Merchant", "Description", "Payment Mode", "Amount"};

    private final ExpenseRepository expenseRepository;
    private final ReportService reportService;

    public CsvExport export(ReportFilterRequest filter, boolean entireDatabase, Long userId) {
        List<Expense> expenses;
        String filename;

        if (entireDatabase) {
            // "All" means all of THIS user's expenses, not every user's data.
            Specification<Expense> spec = Specification.where(ExpenseSpecifications.userIdEquals(userId));
            expenses = expenseRepository.findAll(spec, Sort.by(Sort.Direction.ASC, "expenseDate"));
            filename = "expenses_all.csv";
        } else {
            ReportService.DateWindow window = reportService.resolveWindow(filter, userId);
            Specification<Expense> spec = Specification
                    .where(ExpenseSpecifications.userIdEquals(userId))
                    .and(ExpenseSpecifications.dateBetween(window.start(), window.end()))
                    .and(ExpenseSpecifications.categoryIdEquals(filter.getCategoryId()))
                    .and(ExpenseSpecifications.paymentModeEquals(filter.getPaymentMode()))
                    .and(ExpenseSpecifications.merchantContains(filter.getMerchant()));
            expenses = expenseRepository.findAll(spec, Sort.by(Sort.Direction.ASC, "expenseDate"));
            filename = buildFilename(filter, window);
        }

        String csv = toCsv(expenses);
        log.info("Exported {} expenses to CSV '{}' for userId={}", expenses.size(), filename, userId);
        return new CsvExport(filename, csv);
    }

    private String buildFilename(ReportFilterRequest filter, ReportService.DateWindow window) {
        if (filter.getDate() != null) {
            return "expenses_" + filter.getDate().format(CSV_DATE_FORMAT).replace("-", "_") + ".csv";
        }
        if (filter.getMonth() != null) {
            int year = filter.getYear() != null ? filter.getYear() : LocalDate.now().getYear();
            return String.format("expenses_%d_%02d.csv", year, filter.getMonth());
        }
        if (filter.getYear() != null && filter.getStartDate() == null && filter.getEndDate() == null) {
            return "expenses_" + filter.getYear() + ".csv";
        }
        return "expenses_" + window.start().format(CSV_DATE_FORMAT).replace("-", "_")
                + "_to_" + window.end().format(CSV_DATE_FORMAT).replace("-", "_") + ".csv";
    }

    private String toCsv(List<Expense> expenses) {
        StringWriter writer = new StringWriter();
        try (CSVPrinter printer = new CSVPrinter(writer, CSVFormat.DEFAULT.builder().setHeader(HEADERS).build())) {
            for (Expense e : expenses) {
                printer.printRecord(
                        e.getExpenseDate().format(CSV_DATE_FORMAT),
                        e.getCategory().getName(),
                        e.getMerchant() == null ? "" : e.getMerchant(),
                        e.getDescription() == null ? "" : e.getDescription(),
                        e.getPaymentMode(),
                        e.getAmount()
                );
            }
        } catch (IOException e) {
            throw new IllegalStateException("Failed to generate CSV export", e);
        }
        return writer.toString();
    }

    public record CsvExport(String filename, String content) {
    }
}
