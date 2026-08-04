package com.example.doctorappointment.dto.request;

import java.time.LocalDate;

public record CreatePatientFolderRequestDTO(
        Long patientId,

        String fullName,

        String email,

        String phone,

        LocalDate dateOfBirth,

        String initialNotes
) {}
