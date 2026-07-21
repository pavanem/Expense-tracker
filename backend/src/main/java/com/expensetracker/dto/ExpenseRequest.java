package com.expensetracker.dto;

import com.expensetracker.entity.PaymentMode;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseRequest {

    @NotNull(message = "Amount is mandatory")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    @Digits(integer = 10, fraction = 2, message = "Amount must have at most 2 decimal places")
    private BigDecimal amount;

    @NotNull(message = "Category is mandatory")
    private Long categoryId;

    @Size(max = 150, message = "Merchant must not exceed 150 characters")
    private String merchant;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    @NotNull(message = "Payment mode is mandatory")
    private PaymentMode paymentMode;

    @NotNull(message = "Expense date is mandatory")
    @PastOrPresent(message = "Expense date cannot be in the future")
    private LocalDate expenseDate;
}
