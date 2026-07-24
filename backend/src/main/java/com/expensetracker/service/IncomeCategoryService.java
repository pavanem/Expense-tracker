package com.expensetracker.service;

import com.expensetracker.dto.IncomeCategoryRequest;
import com.expensetracker.dto.IncomeCategoryResponse;
import com.expensetracker.entity.IncomeCategory;
import com.expensetracker.entity.CategoryStatus;
import com.expensetracker.exception.CategoryInUseException;
import com.expensetracker.exception.DuplicateResourceException;
import com.expensetracker.exception.ResourceNotFoundException;
import com.expensetracker.mapper.IncomeCategoryMapper;
import com.expensetracker.repository.IncomeCategoryRepository;
import com.expensetracker.repository.IncomeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class IncomeCategoryService {

    private final IncomeCategoryRepository incomeCategoryRepository;
    private final IncomeRepository incomeRepository;
    private final IncomeCategoryMapper incomeCategoryMapper;

    public IncomeCategoryResponse create(IncomeCategoryRequest request) {
        if (incomeCategoryRepository.existsByNameIgnoreCase(request.getName())) {
            throw new DuplicateResourceException("An income category named '" + request.getName() + "' already exists");
        }
        IncomeCategory category = incomeCategoryMapper.toEntity(request);
        if (category.getStatus() == null) {
            category.setStatus(CategoryStatus.ACTIVE);
        }
        IncomeCategory saved = incomeCategoryRepository.save(category);
        log.info("Created income category id={} name={}", saved.getId(), saved.getName());
        return incomeCategoryMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<IncomeCategoryResponse> findAll(boolean activeOnly) {
        List<IncomeCategory> categories = activeOnly
                ? incomeCategoryRepository.findByStatusOrderByDisplayOrderAsc(CategoryStatus.ACTIVE)
                : incomeCategoryRepository.findAllByOrderByDisplayOrderAsc();
        return categories.stream().map(incomeCategoryMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public IncomeCategoryResponse findById(Long id) {
        return incomeCategoryMapper.toResponse(getCategoryOrThrow(id));
    }

    public IncomeCategoryResponse update(Long id, IncomeCategoryRequest request) {
        IncomeCategory category = getCategoryOrThrow(id);

        incomeCategoryRepository.findByNameIgnoreCase(request.getName())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("An income category named '" + request.getName() + "' already exists");
                });

        incomeCategoryMapper.updateEntityFromRequest(request, category);
        IncomeCategory saved = incomeCategoryRepository.save(category);
        log.info("Updated income category id={}", saved.getId());
        return incomeCategoryMapper.toResponse(saved);
    }

    public IncomeCategoryResponse setStatus(Long id, CategoryStatus status) {
        IncomeCategory category = getCategoryOrThrow(id);
        category.setStatus(status);
        IncomeCategory saved = incomeCategoryRepository.save(category);
        log.info("Income category id={} status set to {}", id, status);
        return incomeCategoryMapper.toResponse(saved);
    }

    public void delete(Long id) {
        IncomeCategory category = getCategoryOrThrow(id);
        if (incomeRepository.existsByIncomeCategoryId(id)) {
            throw new CategoryInUseException(
                    "Income category '" + category.getName() + "' has existing incomes and cannot be deleted. "
                            + "Deactivate it instead.");
        }
        incomeCategoryRepository.delete(category);
        log.info("Deleted income category id={}", id);
    }

    private IncomeCategory getCategoryOrThrow(Long id) {
        return incomeCategoryRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.forEntity("IncomeCategory", id));
    }
}
