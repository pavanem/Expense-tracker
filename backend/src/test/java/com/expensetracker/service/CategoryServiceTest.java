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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock private CategoryRepository categoryRepository;
    @Mock private ExpenseRepository expenseRepository;
    @Mock private CategoryMapper categoryMapper;

    @InjectMocks
    private CategoryService categoryService;

    private Category category;
    private CategoryRequest request;

    @BeforeEach
    void setUp() {
        category = Category.builder().id(1L).name("Food").color("#FF7043").displayOrder(1)
                .status(CategoryStatus.ACTIVE).build();
        request = CategoryRequest.builder().name("Food").color("#FF7043").displayOrder(1)
                .status(CategoryStatus.ACTIVE).build();
    }

    @Test
    void create_savesCategory_whenNameIsUnique() {
        when(categoryRepository.existsByNameIgnoreCase("Food")).thenReturn(false);
        when(categoryMapper.toEntity(request)).thenReturn(category);
        when(categoryRepository.save(category)).thenReturn(category);
        when(categoryMapper.toResponse(category)).thenReturn(
                CategoryResponse.builder().id(1L).name("Food").build());

        CategoryResponse response = categoryService.create(request);

        assertThat(response.getName()).isEqualTo("Food");
        verify(categoryRepository).save(category);
    }

    @Test
    void create_throwsDuplicate_whenNameAlreadyExists() {
        when(categoryRepository.existsByNameIgnoreCase("Food")).thenReturn(true);

        assertThatThrownBy(() -> categoryService.create(request))
                .isInstanceOf(DuplicateResourceException.class);

        verify(categoryRepository, never()).save(any());
    }

    @Test
    void findById_throwsNotFound_whenMissing() {
        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> categoryService.findById(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void update_throwsDuplicate_whenRenamingToAnotherExistingCategory() {
        Category other = Category.builder().id(2L).name("Fuel").build();
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(categoryRepository.findByNameIgnoreCase("Fuel")).thenReturn(Optional.of(other));

        CategoryRequest renameRequest = CategoryRequest.builder().name("Fuel").color("#000").displayOrder(1).build();

        assertThatThrownBy(() -> categoryService.update(1L, renameRequest))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    void delete_removesCategory_whenNotReferencedByAnyExpense() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(expenseRepository.existsByCategoryId(1L)).thenReturn(false);

        categoryService.delete(1L);

        verify(categoryRepository).delete(category);
    }

    @Test
    void delete_throwsCategoryInUse_whenExpensesReferenceIt() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(expenseRepository.existsByCategoryId(1L)).thenReturn(true);

        assertThatThrownBy(() -> categoryService.delete(1L))
                .isInstanceOf(CategoryInUseException.class);

        verify(categoryRepository, never()).delete(any());
    }

    @Test
    void setStatus_updatesAndSaves() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(categoryRepository.save(any(Category.class))).thenAnswer(inv -> inv.getArgument(0));
        when(categoryMapper.toResponse(any(Category.class))).thenReturn(
                CategoryResponse.builder().id(1L).status(CategoryStatus.INACTIVE).build());

        CategoryResponse response = categoryService.setStatus(1L, CategoryStatus.INACTIVE);

        assertThat(response.getStatus()).isEqualTo(CategoryStatus.INACTIVE);
        assertThat(category.getStatus()).isEqualTo(CategoryStatus.INACTIVE);
    }
}
