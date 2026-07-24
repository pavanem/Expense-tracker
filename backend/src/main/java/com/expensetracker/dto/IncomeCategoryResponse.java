package com.expensetracker.dto;

import com.expensetracker.entity.CategoryStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IncomeCategoryResponse {
    private Long id;
    private String name;
    private String icon;
    private String color;
    private Integer displayOrder;
    private CategoryStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
