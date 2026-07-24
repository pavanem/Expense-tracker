package com.expensetracker.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IncomeRequest {

    @NotNull(message = "Amount is mandatory")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    @Digits(integer = 10, fraction = 2, message = "Amount must have at most 2 decimal places")
    private BigDecimal amount;

    @NotNull(message = "Income category is mandatory")
    private Long incomeCategoryId;

    @Size(max = 150, message = "Source must not exceed 150 characters")
    private String source;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    @NotNull(message = "Income date is mandatory")
    @PastOrPresent(message = "Income date cannot be in the future")
    private LocalDate incomeDate;
}
