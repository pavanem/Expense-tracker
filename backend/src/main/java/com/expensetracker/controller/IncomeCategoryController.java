package com.expensetracker.controller;

import com.expensetracker.dto.IncomeCategoryRequest;
import com.expensetracker.dto.IncomeCategoryResponse;
import com.expensetracker.entity.CategoryStatus;
import com.expensetracker.service.IncomeCategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/income-categories")
@RequiredArgsConstructor
@Tag(name = "Income Categories", description = "Income category CRUD and status management")
public class IncomeCategoryController {

    private final IncomeCategoryService incomeCategoryService;

    @PostMapping
    @Operation(summary = "Create a new income category")
    public ResponseEntity<IncomeCategoryResponse> create(@Valid @RequestBody IncomeCategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(incomeCategoryService.create(request));
    }

    @GetMapping
    @Operation(summary = "List income categories, optionally restricted to active ones")
    public ResponseEntity<List<IncomeCategoryResponse>> findAll(
            @RequestParam(name = "activeOnly", defaultValue = "false") boolean activeOnly) {
        return ResponseEntity.ok(incomeCategoryService.findAll(activeOnly));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get an income category by id")
    public ResponseEntity<IncomeCategoryResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(incomeCategoryService.findById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an income category")
    public ResponseEntity<IncomeCategoryResponse> update(@PathVariable Long id, @Valid @RequestBody IncomeCategoryRequest request) {
        return ResponseEntity.ok(incomeCategoryService.update(id, request));
    }

    @PatchMapping("/{id}/activate")
    @Operation(summary = "Activate an income category")
    public ResponseEntity<IncomeCategoryResponse> activate(@PathVariable Long id) {
        return ResponseEntity.ok(incomeCategoryService.setStatus(id, CategoryStatus.ACTIVE));
    }

    @PatchMapping("/{id}/deactivate")
    @Operation(summary = "Deactivate an income category")
    public ResponseEntity<IncomeCategoryResponse> deactivate(@PathVariable Long id) {
        return ResponseEntity.ok(incomeCategoryService.setStatus(id, CategoryStatus.INACTIVE));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an income category (only if no incomes reference it)")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        incomeCategoryService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
