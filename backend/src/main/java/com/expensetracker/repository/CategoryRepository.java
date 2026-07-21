package com.expensetracker.repository;

import com.expensetracker.entity.Category;
import com.expensetracker.entity.CategoryStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    Optional<Category> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);

    List<Category> findByStatusOrderByDisplayOrderAsc(CategoryStatus status);

    List<Category> findAllByOrderByDisplayOrderAsc();
}
