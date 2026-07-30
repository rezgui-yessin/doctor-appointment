package com.example.doctorappointment.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TriageResponseDTO {
    private String recommendation;
    private String suggestedSpecialization;
    private List<DoctorSuggestionDTO> doctors;
}
