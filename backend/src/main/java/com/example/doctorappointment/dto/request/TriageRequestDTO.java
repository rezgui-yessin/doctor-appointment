package com.example.doctorappointment.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TriageRequestDTO {
    @NotBlank(message = "Symptoms cannot be empty")
    private String symptoms;
}
