package com.expensetracker.controller;

import com.expensetracker.dto.CategoryRequest;
import com.expensetracker.dto.CategoryResponse;
import com.expensetracker.entity.CategoryStatus;
import com.expensetracker.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@Tag(name = "Categories", description = "Category CRUD and activation management")
public class CategoryController {

    private final CategoryService categoryService;

    @PostMapping
    @Operation(summary = "Create a new category")
    public ResponseEntity<CategoryResponse> create(@Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(categoryService.create(request));
    }

    @GetMapping
    @Operation(summary = "List categories, optionally restricted to active ones")
    public ResponseEntity<List<CategoryResponse>> findAll(
            @RequestParam(name = "activeOnly", defaultValue = "false") boolean activeOnly) {
        return ResponseEntity.ok(categoryService.findAll(activeOnly));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a category by id")
    public ResponseEntity<CategoryResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(categoryService.findById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a category")
    public ResponseEntity<CategoryResponse> update(@PathVariable Long id, @Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.ok(categoryService.update(id, request));
    }

    @PatchMapping("/{id}/activate")
    @Operation(summary = "Activate a category")
    public ResponseEntity<CategoryResponse> activate(@PathVariable Long id) {
        return ResponseEntity.ok(categoryService.setStatus(id, CategoryStatus.ACTIVE));
    }

    @PatchMapping("/{id}/deactivate")
    @Operation(summary = "Deactivate a category")
    public ResponseEntity<CategoryResponse> deactivate(@PathVariable Long id) {
        return ResponseEntity.ok(categoryService.setStatus(id, CategoryStatus.INACTIVE));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a category (only if no expenses reference it)")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        categoryService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
