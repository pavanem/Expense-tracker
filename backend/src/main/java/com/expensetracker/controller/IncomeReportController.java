package com.expensetracker.controller;

import com.expensetracker.dto.ReportFilterRequest;
import com.expensetracker.dto.ReportResponse;
import com.expensetracker.security.AuthenticatedUser;
import com.expensetracker.service.IncomeReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/reports/income")
@RequiredArgsConstructor
@Tag(name = "Income Reports", description = "Aggregated income reports by day, month, year, or custom range")
public class IncomeReportController {

    private final IncomeReportService incomeReportService;

    @GetMapping("/daily")
    @Operation(summary = "Income report for a specific date")
    public ResponseEntity<ReportResponse> daily(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String source,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        Long userId = principal != null ? principal.userId() : null;
        ReportFilterRequest filter = ReportFilterRequest.builder()
                .date(date != null ? date : LocalDate.now())
                .categoryId(categoryId).merchant(source).build();
        return ResponseEntity.ok(incomeReportService.generate(filter, userId));
    }

    @GetMapping("/monthly")
    @Operation(summary = "Income report for a specific month")
    public ResponseEntity<ReportResponse> monthly(
            @RequestParam int month,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String source,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        Long userId = principal != null ? principal.userId() : null;
        ReportFilterRequest filter = ReportFilterRequest.builder()
                .month(month).year(year).categoryId(categoryId).merchant(source).build();
        return ResponseEntity.ok(incomeReportService.generate(filter, userId));
    }

    @GetMapping("/yearly")
    @Operation(summary = "Income report for a specific year")
    public ResponseEntity<ReportResponse> yearly(
            @RequestParam int year,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String source,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        Long userId = principal != null ? principal.userId() : null;
        ReportFilterRequest filter = ReportFilterRequest.builder()
                .year(year).categoryId(categoryId).merchant(source).build();
        return ResponseEntity.ok(incomeReportService.generate(filter, userId));
    }

    @GetMapping("/range")
    @Operation(summary = "Income report for a custom date range")
    public ResponseEntity<ReportResponse> range(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String source,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        Long userId = principal != null ? principal.userId() : null;
        ReportFilterRequest filter = ReportFilterRequest.builder()
                .startDate(startDate).endDate(endDate)
                .categoryId(categoryId).merchant(source).build();
        return ResponseEntity.ok(incomeReportService.generate(filter, userId));
    }
}
