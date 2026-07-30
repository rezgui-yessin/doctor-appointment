package com.example.doctorappointment.dto.response;

import java.time.LocalDateTime;

public record PatientFolderDTO(
        Long patientId,
        String patientName,
        String patientEmail,
        String patientPhone,
        String patientPhotoUrl,
        int totalVisits,
        LocalDateTime lastVisit,
        String lastVisitStatus
) {}
