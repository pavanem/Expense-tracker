package com.expensetracker.repository;

import com.expensetracker.entity.IncomeCategory;
import com.expensetracker.entity.CategoryStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface IncomeCategoryRepository extends JpaRepository<IncomeCategory, Long> {

    Optional<IncomeCategory> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);

    List<IncomeCategory> findByStatusOrderByDisplayOrderAsc(CategoryStatus status);

    List<IncomeCategory> findAllByOrderByDisplayOrderAsc();
}
