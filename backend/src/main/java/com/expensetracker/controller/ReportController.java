package com.expensetracker.controller;

import com.expensetracker.dto.ReportFilterRequest;
import com.expensetracker.dto.ReportResponse;
import com.expensetracker.entity.PaymentMode;
import com.expensetracker.security.AuthenticatedUser;
import com.expensetracker.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Tag(name = "Reports", description = "Aggregated expense reports by day, month, year, or custom range")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/daily")
    @Operation(summary = "Report for a specific date (defaults to today if omitted)")
    public ResponseEntity<ReportResponse> daily(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) PaymentMode paymentMode,
            @RequestParam(required = false) String merchant,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        Long userId = principal != null ? principal.userId() : null;
        ReportFilterRequest filter = ReportFilterRequest.builder()
                .date(date != null ? date : LocalDate.now())
                .categoryId(categoryId).paymentMode(paymentMode).merchant(merchant).build();
        return ResponseEntity.ok(reportService.generate(filter, userId));
    }

    @GetMapping("/monthly")
    @Operation(summary = "Report for a specific month (year defaults to current year)")
    public ResponseEntity<ReportResponse> monthly(
            @RequestParam int month,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) PaymentMode paymentMode,
            @RequestParam(required = false) String merchant,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        Long userId = principal != null ? principal.userId() : null;
        ReportFilterRequest filter = ReportFilterRequest.builder()
                .month(month).year(year).categoryId(categoryId).paymentMode(paymentMode).merchant(merchant).build();
        return ResponseEntity.ok(reportService.generate(filter, userId));
    }

    @GetMapping("/yearly")
    @Operation(summary = "Report for a specific year")
    public ResponseEntity<ReportResponse> yearly(
            @RequestParam int year,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) PaymentMode paymentMode,
            @RequestParam(required = false) String merchant,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        Long userId = principal != null ? principal.userId() : null;
        ReportFilterRequest filter = ReportFilterRequest.builder()
                .year(year).categoryId(categoryId).paymentMode(paymentMode).merchant(merchant).build();
        return ResponseEntity.ok(reportService.generate(filter, userId));
    }

    @GetMapping("/range")
    @Operation(summary = "Report for a custom date range")
    public ResponseEntity<ReportResponse> range(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) PaymentMode paymentMode,
            @RequestParam(required = false) String merchant,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        Long userId = principal != null ? principal.userId() : null;
        ReportFilterRequest filter = ReportFilterRequest.builder()
                .startDate(startDate).endDate(endDate)
                .categoryId(categoryId).paymentMode(paymentMode).merchant(merchant).build();
        return ResponseEntity.ok(reportService.generate(filter, userId));
    }
}
