package com.expensetracker.service;

import com.expensetracker.dto.ExpenseRequest;
import com.expensetracker.dto.ExpenseResponse;
import com.expensetracker.dto.PageResponse;
import com.expensetracker.entity.Category;
import com.expensetracker.entity.Expense;
import com.expensetracker.entity.PaymentMode;
import com.expensetracker.entity.User;
import com.expensetracker.exception.ResourceNotFoundException;
import com.expensetracker.mapper.ExpenseMapper;
import com.expensetracker.repository.CategoryRepository;
import com.expensetracker.repository.ExpenseRepository;
import com.expensetracker.repository.ExpenseSpecifications;
import com.expensetracker.repository.UserRepository;
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
    private final UserRepository userRepository;
    private final ExpenseMapper expenseMapper;

    public ExpenseResponse create(ExpenseRequest request, Long userId) {
        Expense expense = new Expense();
        applyRequest(expense, request, userId);
        Expense saved = expenseRepository.save(expense);
        log.info("Created expense id={} amount={} category={} userId={}",
                saved.getId(), saved.getAmount(), saved.getCategory().getName(), userId);
        return expenseMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public ExpenseResponse findById(Long id, Long userId) {
        return expenseMapper.toResponse(getExpenseOrThrow(id, userId));
    }

    public ExpenseResponse update(Long id, ExpenseRequest request, Long userId) {
        Expense expense = getExpenseOrThrow(id, userId);
        applyRequest(expense, request, userId);
        Expense saved = expenseRepository.save(expense);
        log.info("Updated expense id={} userId={}", saved.getId(), userId);
        return expenseMapper.toResponse(saved);
    }

    public void delete(Long id, Long userId) {
        Expense expense = getExpenseOrThrow(id, userId);
        expenseRepository.delete(expense);
        log.info("Deleted expense id={} userId={}", id, userId);
    }

    /**
     * Combined listing endpoint: filter, free-text search, sort, paginate — all
     * scoped to the requesting user. sortBy is validated by the controller against
     * a whitelist to prevent property injection.
     */
    @Transactional(readOnly = true)
    public PageResponse<ExpenseResponse> search(ExpenseSearchCriteria criteria, Pageable pageable) {
        Specification<Expense> spec = Specification
                .where(ExpenseSpecifications.userIdEquals(criteria.userId()))
                .and(ExpenseSpecifications.categoryIdEquals(criteria.categoryId()))
                .and(ExpenseSpecifications.paymentModeEquals(criteria.paymentMode()))
                .and(ExpenseSpecifications.merchantContains(criteria.merchant()))
                .and(ExpenseSpecifications.dateBetween(criteria.startDate(), criteria.endDate()))
                .and(ExpenseSpecifications.amountBetween(criteria.minAmount(), criteria.maxAmount()))
                .and(ExpenseSpecifications.keywordSearch(criteria.keyword()));

        Page<Expense> page = expenseRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(expenseMapper::toResponse));
    }

    private void applyRequest(Expense expense, ExpenseRequest request, Long userId) {
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> ResourceNotFoundException.forEntity("Category", request.getCategoryId()));

        if (userId != null) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> ResourceNotFoundException.forEntity("User", userId));
            expense.setUser(user);
        }
        expense.setAmount(request.getAmount());
        expense.setCategory(category);
        expense.setMerchant(request.getMerchant());
        expense.setDescription(request.getDescription());
        expense.setPaymentMode(request.getPaymentMode());
        expense.setExpenseDate(request.getExpenseDate());
    }

    /**
     * Returns the expense only if it belongs to the requesting user.
     * Returns ResourceNotFoundException in both not-found and wrong-owner cases
     * to avoid leaking the existence of another user's records.
     */
    private Expense getExpenseOrThrow(Long id, Long userId) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.forEntity("Expense", id));

        if (userId != null && !expense.getUser().getId().equals(userId)) {
            throw ResourceNotFoundException.forEntity("Expense", id);
        }
        return expense;
    }

    public record ExpenseSearchCriteria(
            Long userId,
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
