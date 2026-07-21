package com.expensetracker.repository;

import com.expensetracker.entity.Category;
import com.expensetracker.entity.CategoryStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class CategoryRepositoryTest {

    @Autowired
    private CategoryRepository categoryRepository;

    private Category category(String name, int order, CategoryStatus status) {
        return Category.builder()
                .name(name)
                .color("#FF7043")
                .displayOrder(order)
                .status(status)
                .build();
    }

    @Test
    void findByNameIgnoreCase_matchesRegardlessOfCase() {
        categoryRepository.save(category("Groceries", 1, CategoryStatus.ACTIVE));

        Optional<Category> found = categoryRepository.findByNameIgnoreCase("groceries");

        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Groceries");
    }

    @Test
    void existsByNameIgnoreCase_reflectsSavedCategories() {
        categoryRepository.save(category("Travel", 1, CategoryStatus.ACTIVE));

        assertThat(categoryRepository.existsByNameIgnoreCase("TRAVEL")).isTrue();
        assertThat(categoryRepository.existsByNameIgnoreCase("Unknown")).isFalse();
    }

    @Test
    void findByStatusOrderByDisplayOrderAsc_returnsOnlyMatchingStatusInOrder() {
        categoryRepository.save(category("Bills", 2, CategoryStatus.ACTIVE));
        categoryRepository.save(category("Food", 1, CategoryStatus.ACTIVE));
        categoryRepository.save(category("Old", 0, CategoryStatus.INACTIVE));

        List<Category> active = categoryRepository.findByStatusOrderByDisplayOrderAsc(CategoryStatus.ACTIVE);

        assertThat(active).extracting(Category::getName).containsExactly("Food", "Bills");
    }

    @Test
    void findAllByOrderByDisplayOrderAsc_returnsEveryCategoryRegardlessOfStatus() {
        categoryRepository.save(category("Bills", 2, CategoryStatus.ACTIVE));
        categoryRepository.save(category("Old", 1, CategoryStatus.INACTIVE));

        List<Category> all = categoryRepository.findAllByOrderByDisplayOrderAsc();

        assertThat(all).extracting(Category::getName).containsExactly("Old", "Bills");
    }
}
