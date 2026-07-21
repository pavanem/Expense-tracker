package com.expensetracker.service;

import com.expensetracker.dto.ExpenseRequest;
import com.expensetracker.dto.ExpenseResponse;
import com.expensetracker.dto.PageResponse;
import com.expensetracker.entity.Category;
import com.expensetracker.entity.Expense;
import com.expensetracker.entity.PaymentMode;
import com.expensetracker.exception.ResourceNotFoundException;
import com.expensetracker.mapper.ExpenseMapper;
import com.expensetracker.repository.CategoryRepository;
import com.expensetracker.repository.ExpenseRepository;
import com.expensetracker.repository.ExpenseSpecifications;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final CategoryRepository categoryRepository;
    private final ExpenseMapper expenseMapper;

    public ExpenseResponse create(ExpenseRequest request) {
        Expense expense = new Expense();
        applyRequest(expense, request);
        Expense saved = expenseRepository.save(expense);
        log.info("Created expense id={} amount={} category={}", saved.getId(), saved.getAmount(),
                saved.getCategory().getName());
        return expenseMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public ExpenseResponse findById(Long id) {
        return expenseMapper.toResponse(getExpenseOrThrow(id));
    }

    public ExpenseResponse update(Long id, ExpenseRequest request) {
        Expense expense = getExpenseOrThrow(id);
        applyRequest(expense, request);
        Expense saved = expenseRepository.save(expense);
        log.info("Updated expense id={}", saved.getId());
        return expenseMapper.toResponse(saved);
    }

    public void delete(Long id) {
        Expense expense = getExpenseOrThrow(id);
        expenseRepository.delete(expense);
        log.info("Deleted expense id={}", id);
    }

    /**
     * Combined listing endpoint: supports filter (category/paymentMode/merchant/
     * date range/amount range), free-text search, sorting, and pagination all at
     * once, per the SRS. `sortBy` is validated against a whitelist to prevent
     * arbitrary property injection.
     */
    @Transactional(readOnly = true)
    public PageResponse<ExpenseResponse> search(ExpenseSearchCriteria criteria, Pageable pageable) {
        Specification<Expense> spec = Specification
                .where(ExpenseSpecifications.categoryIdEquals(criteria.categoryId()))
                .and(ExpenseSpecifications.paymentModeEquals(criteria.paymentMode()))
                .and(ExpenseSpecifications.merchantContains(criteria.merchant()))
                .and(ExpenseSpecifications.dateBetween(criteria.startDate(), criteria.endDate()))
                .and(ExpenseSpecifications.amountBetween(criteria.minAmount(), criteria.maxAmount()))
                .and(ExpenseSpecifications.keywordSearch(criteria.keyword()));

        Page<Expense> page = expenseRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(expenseMapper::toResponse));
    }

    private void applyRequest(Expense expense, ExpenseRequest request) {
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> ResourceNotFoundException.forEntity("Category", request.getCategoryId()));

        expense.setAmount(request.getAmount());
        expense.setCategory(category);
        expense.setMerchant(request.getMerchant());
        expense.setDescription(request.getDescription());
        expense.setPaymentMode(request.getPaymentMode());
        expense.setExpenseDate(request.getExpenseDate());
    }

    private Expense getExpenseOrThrow(Long id) {
        return expenseRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.forEntity("Expense", id));
    }

    /**
     * Search/filter parameters bundled together to keep the service method
     * signature manageable; built by ExpenseController from request params.
     */
    public record ExpenseSearchCriteria(
            String keyword,
            Long categoryId,
            PaymentMode paymentMode,
            String merchant,
            LocalDate startDate,
            LocalDate endDate,
            BigDecimal minAmount,
            BigDecimal maxAmount
    ) {
    }
}
