package com.example.doctorappointment.mapper;

import com.example.doctorappointment.dto.response.AppointmentResponseDTO;
import com.example.doctorappointment.entity.Appointment;
import org.springframework.stereotype.Component;

@Component
public class AppointmentMapper {

    public AppointmentResponseDTO toDto(Appointment appointment) {
        if (appointment == null) return null;
        Long docId = appointment.getDoctor() != null ? appointment.getDoctor().getId() : null;
        String docName = appointment.getDoctor() != null ? appointment.getDoctor().getFullName() : "Doctor";
        Long patId = appointment.getPatient() != null ? appointment.getPatient().getId() : null;
        String patName = appointment.getPatient() != null ? appointment.getPatient().getFullName() : "Patient";

        return new AppointmentResponseDTO(
                appointment.getId(),
                docId,
                docName,
                patId,
                patName,
                appointment.getAppointmentTime(),
                appointment.getStatus(),
                appointment.getReason()
        );
    }
}
