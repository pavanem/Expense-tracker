package com.expensetracker.controller;

import com.expensetracker.dto.IncomeRequest;
import com.expensetracker.dto.IncomeResponse;
import com.expensetracker.dto.PageResponse;
import com.expensetracker.exception.InvalidRequestException;
import com.expensetracker.security.AuthenticatedUser;
import com.expensetracker.service.IncomeService;
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
@RequestMapping("/api/incomes")
@RequiredArgsConstructor
@Tag(name = "Incomes", description = "Income CRUD, search, filter, sort and pagination")
public class IncomeController {

    private static final Set<String> SORTABLE_FIELDS = Set.of(
            "incomeDate", "amount", "incomeCategory.name", "source", "createdAt");

    private final IncomeService incomeService;

    @PostMapping
    @Operation(summary = "Create a new income record")
    public ResponseEntity<IncomeResponse> create(
            @Valid @RequestBody IncomeRequest request,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        Long userId = principal != null ? principal.userId() : null;
        return ResponseEntity.status(HttpStatus.CREATED).body(incomeService.create(request, userId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get an income record by id")
    public ResponseEntity<IncomeResponse> findById(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        Long userId = principal != null ? principal.userId() : null;
        return ResponseEntity.ok(incomeService.findById(id, userId));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an income record")
    public ResponseEntity<IncomeResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody IncomeRequest request,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        Long userId = principal != null ? principal.userId() : null;
        return ResponseEntity.ok(incomeService.update(id, request, userId));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an income record")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        Long userId = principal != null ? principal.userId() : null;
        incomeService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    @Operation(summary = "List income records with filter, sort and pagination")
    public ResponseEntity<PageResponse<IncomeResponse>> list(
            @RequestParam(required = false) Long incomeCategoryId,
            @RequestParam(required = false) String source,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) BigDecimal minAmount,
            @RequestParam(required = false) BigDecimal maxAmount,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "incomeDate") String sortBy,
            @RequestParam(defaultValue = "DESC") Sort.Direction sortDir,
            @AuthenticationPrincipal AuthenticatedUser principal) {

        Long userId = principal != null ? principal.userId() : null;
        Pageable pageable = buildPageable(page, size, sortBy, sortDir);
        var criteria = new IncomeService.IncomeSearchCriteria(
                userId, null, incomeCategoryId, source, startDate, endDate, minAmount, maxAmount);
        return ResponseEntity.ok(incomeService.search(criteria, pageable));
    }

    @GetMapping("/search")
    @Operation(summary = "Real-time search across income category, source, description, amount, date")
    public ResponseEntity<PageResponse<IncomeResponse>> search(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "incomeDate") String sortBy,
            @RequestParam(defaultValue = "DESC") Sort.Direction sortDir,
            @AuthenticationPrincipal AuthenticatedUser principal) {

        Long userId = principal != null ? principal.userId() : null;
        Pageable pageable = buildPageable(page, size, sortBy, sortDir);
        var criteria = new IncomeService.IncomeSearchCriteria(
                userId, keyword, null, null, null, null, null, null);
        return ResponseEntity.ok(incomeService.search(criteria, pageable));
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
