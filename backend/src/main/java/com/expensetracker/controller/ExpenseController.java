package com.expensetracker.controller;

import com.expensetracker.dto.ExpenseRequest;
import com.expensetracker.dto.ExpenseResponse;
import com.expensetracker.dto.PageResponse;
import com.expensetracker.entity.PaymentMode;
import com.expensetracker.exception.InvalidRequestException;
import com.expensetracker.security.AuthenticatedUser;
import com.expensetracker.service.ExpenseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;

@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
@Tag(name = "Expenses", description = "Expense CRUD, search, filter, sort and pagination")
public class ExpenseController {

    /** Whitelist prevents arbitrary/unsafe property names reaching the ORDER BY clause. */
    private static final Set<String> SORTABLE_FIELDS = Set.of(
            "expenseDate", "amount", "category.name", "merchant", "createdAt");

    private final ExpenseService expenseService;

    @PostMapping
    @Operation(summary = "Create a new expense")
    public ResponseEntity<ExpenseResponse> create(
            @Valid @RequestBody ExpenseRequest request,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        Long userId = principal != null ? principal.userId() : null;
        return ResponseEntity.status(HttpStatus.CREATED).body(expenseService.create(request, userId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get an expense by id")
    public ResponseEntity<ExpenseResponse> findById(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        Long userId = principal != null ? principal.userId() : null;
        return ResponseEntity.ok(expenseService.findById(id, userId));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an expense")
    public ResponseEntity<ExpenseResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ExpenseRequest request,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        Long userId = principal != null ? principal.userId() : null;
        return ResponseEntity.ok(expenseService.update(id, request, userId));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an expense")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        Long userId = principal != null ? principal.userId() : null;
        expenseService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    @Operation(summary = "List expenses with filter, sort and pagination (server-side)")
    public ResponseEntity<PageResponse<ExpenseResponse>> list(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) PaymentMode paymentMode,
            @RequestParam(required = false) String merchant,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) BigDecimal minAmount,
            @RequestParam(required = false) BigDecimal maxAmount,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "expenseDate") String sortBy,
            @RequestParam(defaultValue = "DESC") Sort.Direction sortDir,
            @AuthenticationPrincipal AuthenticatedUser principal) {

        Long userId = principal != null ? principal.userId() : null;
        Pageable pageable = buildPageable(page, size, sortBy, sortDir);
        var criteria = new ExpenseService.ExpenseSearchCriteria(
                userId, null, categoryId, paymentMode, merchant, startDate, endDate, minAmount, maxAmount);
        return ResponseEntity.ok(expenseService.search(criteria, pageable));
    }

    @GetMapping("/search")
    @Operation(summary = "Real-time search across category, merchant, description, amount, date, payment mode")
    public ResponseEntity<PageResponse<ExpenseResponse>> search(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "expenseDate") String sortBy,
            @RequestParam(defaultValue = "DESC") Sort.Direction sortDir,
            @AuthenticationPrincipal AuthenticatedUser principal) {

        Long userId = principal != null ? principal.userId() : null;
        Pageable pageable = buildPageable(page, size, sortBy, sortDir);
        var criteria = new ExpenseService.ExpenseSearchCriteria(
                userId, keyword, null, null, null, null, null, null, null);
        return ResponseEntity.ok(expenseService.search(criteria, pageable));
    }

    private Pageable buildPageable(int page, int size, String sortBy, Sort.Direction sortDir) {
        if (!SORTABLE_FIELDS.contains(sortBy)) {
            throw new InvalidRequestException(
                    "sortBy must be one of: " + String.join(", ", SORTABLE_FIELDS));
        }
        int safeSize = Math.min(Math.max(size, 1), 200);
        return PageRequest.of(Math.max(page, 0), safeSize, Sort.by(sortDir, sortBy));
    }
}
