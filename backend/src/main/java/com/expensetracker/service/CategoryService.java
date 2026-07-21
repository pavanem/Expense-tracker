package com.expensetracker.service;

import com.expensetracker.dto.CategoryRequest;
import com.expensetracker.dto.CategoryResponse;
import com.expensetracker.entity.Category;
import com.expensetracker.entity.CategoryStatus;
import com.expensetracker.exception.CategoryInUseException;
import com.expensetracker.exception.DuplicateResourceException;
import com.expensetracker.exception.ResourceNotFoundException;
import com.expensetracker.mapper.CategoryMapper;
import com.expensetracker.repository.CategoryRepository;
import com.expensetracker.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ExpenseRepository expenseRepository;
    private final CategoryMapper categoryMapper;

    public CategoryResponse create(CategoryRequest request) {
        if (categoryRepository.existsByNameIgnoreCase(request.getName())) {
            throw new DuplicateResourceException("A category named '" + request.getName() + "' already exists");
        }
        Category category = categoryMapper.toEntity(request);
        if (category.getStatus() == null) {
            category.setStatus(CategoryStatus.ACTIVE);
        }
        Category saved = categoryRepository.save(category);
        log.info("Created category id={} name={}", saved.getId(), saved.getName());
        return categoryMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> findAll(boolean activeOnly) {
        List<Category> categories = activeOnly
                ? categoryRepository.findByStatusOrderByDisplayOrderAsc(CategoryStatus.ACTIVE)
                : categoryRepository.findAllByOrderByDisplayOrderAsc();
        return categories.stream().map(categoryMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public CategoryResponse findById(Long id) {
        return categoryMapper.toResponse(getCategoryOrThrow(id));
    }

    public CategoryResponse update(Long id, CategoryRequest request) {
        Category category = getCategoryOrThrow(id);

        categoryRepository.findByNameIgnoreCase(request.getName())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("A category named '" + request.getName() + "' already exists");
                });

        categoryMapper.updateEntityFromRequest(request, category);
        Category saved = categoryRepository.save(category);
        log.info("Updated category id={}", saved.getId());
        return categoryMapper.toResponse(saved);
    }

    public CategoryResponse setStatus(Long id, CategoryStatus status) {
        Category category = getCategoryOrThrow(id);
        category.setStatus(status);
        Category saved = categoryRepository.save(category);
        log.info("Category id={} status set to {}", id, status);
        return categoryMapper.toResponse(saved);
    }

    /**
     * Hard-deletes a category only if no expense references it; otherwise
     * deactivates it instead, per SRS "Activate/Deactivate Category" plus
     * FK constraint (ON DELETE RESTRICT) on expense.category_id.
     */
    public void delete(Long id) {
        Category category = getCategoryOrThrow(id);
        if (expenseRepository.existsByCategoryId(id)) {
            throw new CategoryInUseException(
                    "Category '" + category.getName() + "' has existing expenses and cannot be deleted. "
                            + "Deactivate it instead.");
        }
        categoryRepository.delete(category);
        log.info("Deleted category id={}", id);
    }

    private Category getCategoryOrThrow(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.forEntity("Category", id));
    }
}
