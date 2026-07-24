package com.expensetracker.dto;

import com.expensetracker.entity.CategoryStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class IncomeCategoryRequest {

    @NotBlank(message = "Category name is mandatory")
    @Size(max = 100, message = "Category name must not exceed 100 characters")
    private String name;

    @Size(max = 100, message = "Icon must not exceed 100 characters")
    private String icon;

    @NotBlank(message = "Category color is mandatory")
    @Size(max = 20, message = "Color must not exceed 20 characters")
    private String color;

    @NotNull(message = "Display order is mandatory")
    private Integer displayOrder;

    private CategoryStatus status;
}
