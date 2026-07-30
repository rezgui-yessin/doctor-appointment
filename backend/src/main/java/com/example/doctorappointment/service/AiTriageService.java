package com.example.doctorappointment.service;

import com.example.doctorappointment.dto.request.TriageRequestDTO;
import com.example.doctorappointment.dto.response.AvailableSlotDTO;
import com.example.doctorappointment.dto.response.DoctorResponseDTO;
import com.example.doctorappointment.dto.response.DoctorSuggestionDTO;
import com.example.doctorappointment.dto.response.TriageResponseDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiTriageService {

    private final OpenAIService openAIService;
    private final DoctorService doctorService;
    private final AppointmentService appointmentService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public TriageResponseDTO processTriage(TriageRequestDTO request) {
        String aiResponseJson = openAIService.analyzeSymptoms(request.getSymptoms());

        String recommendation = "We couldn't analyze your symptoms at this time.";
        String specialization = "General Practitioner";

        try {
            JsonNode rootNode = objectMapper.readTree(aiResponseJson);
            if (rootNode.has("recommendation")) {
                recommendation = rootNode.get("recommendation").asText();
            }
            if (rootNode.has("specialization")) {
                specialization = rootNode.get("specialization").asText();
            }
        } catch (Exception e) {
            log.error("Failed to parse AI response JSON: {}", aiResponseJson, e);
        }

        List<DoctorResponseDTO> doctors = doctorService.getBySpecialization(specialization);
        
        // Limit to top 3 doctors to keep response fast and clean
        int limit = Math.min(doctors.size(), 3);
        List<DoctorSuggestionDTO> doctorSuggestions = new ArrayList<>();

        for (int i = 0; i < limit; i++) {
            DoctorResponseDTO doctor = doctors.get(i);
            
            Map<String, List<AvailableSlotDTO>> slotsByDate = new HashMap<>();
            
            // Check availability for the next 3 days
            LocalDate today = LocalDate.now();
            for (int day = 0; day < 3; day++) {
                LocalDate dateToCheck = today.plusDays(day);
                List<AvailableSlotDTO> slots = appointmentService.getAvailableSlots(doctor.id(), dateToCheck);
                if (!slots.isEmpty()) {
                    slotsByDate.put(dateToCheck.toString(), slots);
                }
            }

            doctorSuggestions.add(DoctorSuggestionDTO.builder()
                    .doctorId(doctor.id())
                    .doctorName(doctor.fullName())
                    .specialization(doctor.specialization())
                    .availableSlots(slotsByDate)
                    .build());
        }

        return TriageResponseDTO.builder()
                .recommendation(recommendation)
                .suggestedSpecialization(specialization)
                .doctors(doctorSuggestions)
                .build();
    }
}
