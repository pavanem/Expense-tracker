package com.expensetracker.controller;

import com.expensetracker.dto.CategoryRequest;
import com.expensetracker.dto.CategoryResponse;
import com.expensetracker.entity.CategoryStatus;
import com.expensetracker.exception.CategoryInUseException;
import com.expensetracker.exception.DuplicateResourceException;
import com.expensetracker.exception.ResourceNotFoundException;
import com.expensetracker.service.CategoryService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = CategoryController.class)
@AutoConfigureMockMvc(addFilters = false) // security disabled in prod config too; not the focus of this slice
class CategoryControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean
    private CategoryService categoryService;

    @Test
    void create_returns201_withValidPayload() throws Exception {
        CategoryRequest request = CategoryRequest.builder()
                .name("Food").color("#FF7043").displayOrder(1).status(CategoryStatus.ACTIVE).build();
        CategoryResponse response = CategoryResponse.builder().id(1L).name("Food").build();

        when(categoryService.create(any(CategoryRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/categories")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Food"));
    }

    @Test
    void create_returns400_whenNameIsBlank() throws Exception {
        CategoryRequest invalid = CategoryRequest.builder()
                .name("").color("#FF7043").displayOrder(1).build();

        mockMvc.perform(post("/api/categories")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.name").exists());
    }

    @Test
    void create_returns409_whenDuplicateName() throws Exception {
        CategoryRequest request = CategoryRequest.builder()
                .name("Food").color("#FF7043").displayOrder(1).build();

        when(categoryService.create(any(CategoryRequest.class)))
                .thenThrow(new DuplicateResourceException("A category named 'Food' already exists"));

        mockMvc.perform(post("/api/categories")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("A category named 'Food' already exists"));
    }

    @Test
    void findById_returns404_whenMissing() throws Exception {
        when(categoryService.findById(99L)).thenThrow(ResourceNotFoundException.forEntity("Category", 99L));

        mockMvc.perform(get("/api/categories/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    void findAll_returnsList() throws Exception {
        when(categoryService.findAll(true)).thenReturn(
                List.of(CategoryResponse.builder().id(1L).name("Food").build()));

        mockMvc.perform(get("/api/categories").param("activeOnly", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Food"));
    }

    @Test
    void delete_returns409_whenCategoryInUse() throws Exception {
        org.mockito.Mockito.doThrow(new CategoryInUseException("Category 'Food' has existing expenses"))
                .when(categoryService).delete(1L);

        mockMvc.perform(delete("/api/categories/1"))
                .andExpect(status().isConflict());
    }

    @Test
    void activate_returns200_withUpdatedStatus() throws Exception {
        when(categoryService.setStatus(eq(1L), eq(CategoryStatus.ACTIVE))).thenReturn(
                CategoryResponse.builder().id(1L).status(CategoryStatus.ACTIVE).build());

        mockMvc.perform(patch("/api/categories/1/activate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }
}
