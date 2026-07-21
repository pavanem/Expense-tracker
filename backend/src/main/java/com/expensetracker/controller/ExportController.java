package com.expensetracker.controller;

import com.expensetracker.dto.ReportFilterRequest;
import com.expensetracker.entity.PaymentMode;
import com.expensetracker.service.CsvExportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Tag(name = "CSV Export", description = "Export expenses as CSV: single day, range, monthly, yearly, category, or entire database")
public class ExportController {

    private final CsvExportService csvExportService;

    @GetMapping("/export")
    @Operation(summary = "Export expenses as CSV based on the supplied filter, or the entire database if 'all=true'")
    public ResponseEntity<byte[]> export(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) PaymentMode paymentMode,
            @RequestParam(required = false) String merchant,
            @RequestParam(defaultValue = "false") boolean all) {

        ReportFilterRequest filter = ReportFilterRequest.builder()
                .date(date)
                .startDate(startDate)
                .endDate(endDate)
                .month(month)
                .year(year)
                .categoryId(categoryId)
                .paymentMode(paymentMode)
                .merchant(merchant)
                .build();

        CsvExportService.CsvExport export = csvExportService.export(filter, all);
        byte[] body = export.content().getBytes(StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(export.filename()).build().toString())
                .body(body);
    }
}
