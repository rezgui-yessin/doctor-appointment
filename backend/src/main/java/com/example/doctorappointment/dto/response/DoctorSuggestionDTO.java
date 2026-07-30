package com.example.doctorappointment.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoctorSuggestionDTO {
    private Long doctorId;
    private String doctorName;
    private String specialization;
    
    // Key: Date string (e.g. "2026-07-23")
    // Value: List of available time slots
    private Map<String, List<AvailableSlotDTO>> availableSlots;
}
