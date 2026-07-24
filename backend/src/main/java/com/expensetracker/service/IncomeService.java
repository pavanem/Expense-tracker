package com.expensetracker.service;

import com.expensetracker.dto.IncomeRequest;
import com.expensetracker.dto.IncomeResponse;
import com.expensetracker.dto.PageResponse;
import com.expensetracker.entity.IncomeCategory;
import com.expensetracker.entity.Income;
import com.expensetracker.entity.User;
import com.expensetracker.exception.InvalidRequestException;
import com.expensetracker.exception.ResourceNotFoundException;
import com.expensetracker.mapper.IncomeMapper;
import com.expensetracker.repository.IncomeCategoryRepository;
import com.expensetracker.repository.IncomeRepository;
import com.expensetracker.repository.IncomeSpecifications;
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
public class IncomeService {

    private final IncomeRepository incomeRepository;
    private final IncomeCategoryRepository incomeCategoryRepository;
    private final UserRepository userRepository;
    private final IncomeMapper incomeMapper;

    public IncomeResponse create(IncomeRequest request, Long userId) {
        Income income = new Income();
        applyRequest(income, request, userId);
        Income saved = incomeRepository.save(income);
        log.info("Created income id={} amount={} category={} userId={}",
                saved.getId(), saved.getAmount(), saved.getIncomeCategory().getName(), userId);
        return incomeMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public IncomeResponse findById(Long id, Long userId) {
        return incomeMapper.toResponse(getIncomeOrThrow(id, userId));
    }

    public IncomeResponse update(Long id, IncomeRequest request, Long userId) {
        Income income = getIncomeOrThrow(id, userId);
        applyRequest(income, request, userId);
        Income saved = incomeRepository.save(income);
        log.info("Updated income id={} userId={}", saved.getId(), userId);
        return incomeMapper.toResponse(saved);
    }

    public void delete(Long id, Long userId) {
        Income income = getIncomeOrThrow(id, userId);
        incomeRepository.delete(income);
        log.info("Deleted income id={} userId={}", id, userId);
    }

    @Transactional(readOnly = true)
    public PageResponse<IncomeResponse> search(IncomeSearchCriteria criteria, Pageable pageable) {
        Specification<Income> spec = Specification
                .where(IncomeSpecifications.userIdEquals(criteria.userId()))
                .and(IncomeSpecifications.categoryIdEquals(criteria.incomeCategoryId()))
                .and(IncomeSpecifications.sourceContains(criteria.source()))
                .and(IncomeSpecifications.dateBetween(criteria.startDate(), criteria.endDate()))
                .and(IncomeSpecifications.amountBetween(criteria.minAmount(), criteria.maxAmount()))
                .and(IncomeSpecifications.keywordSearch(criteria.keyword()));

        Page<Income> page = incomeRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(incomeMapper::toResponse));
    }

    private void applyRequest(Income income, IncomeRequest request, Long userId) {
        if (request.getIncomeDate() != null && request.getIncomeDate().isAfter(LocalDate.now().plusMonths(2))) {
            throw new InvalidRequestException("Income date cannot be more than 2 months in the future");
        }

        IncomeCategory category = incomeCategoryRepository.findById(request.getIncomeCategoryId())
                .orElseThrow(() -> ResourceNotFoundException.forEntity("IncomeCategory", request.getIncomeCategoryId()));

        if (userId != null) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> ResourceNotFoundException.forEntity("User", userId));
            income.setUser(user);
        }
        income.setAmount(request.getAmount());
        income.setIncomeCategory(category);
        income.setSource(request.getSource());
        income.setDescription(request.getDescription());
        income.setIncomeDate(request.getIncomeDate());
    }

    private Income getIncomeOrThrow(Long id, Long userId) {
        Income income = incomeRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.forEntity("Income", id));

        if (userId != null && !income.getUser().getId().equals(userId)) {
            throw ResourceNotFoundException.forEntity("Income", id);
        }
        return income;
    }

    public record IncomeSearchCriteria(
            Long userId,
            String keyword,
            Long incomeCategoryId,
            String source,
            LocalDate startDate,
            LocalDate endDate,
            BigDecimal minAmount,
            BigDecimal maxAmount
    ) {
    }
}
