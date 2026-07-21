package com.expensetracker.dto;

import com.expensetracker.entity.PaymentMode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Common filter shape shared by /api/reports/* and /api/reports/export.
 * All fields are optional; ReportService interprets the combination
 * (specific date > date range > month/year > unrestricted).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportFilterRequest {
    private LocalDate date;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer month;   // 1-12, requires year
    private Integer year;
    private Long categoryId;
    private PaymentMode paymentMode;
    private String merchant;
}
