package com.example.doctorappointment.config;

import com.example.doctorappointment.dto.request.AppointmentRequestDTO;
import com.example.doctorappointment.dto.request.DoctorRequestDTO;
import com.example.doctorappointment.dto.request.PatientRequestDTO;
import com.example.doctorappointment.entity.Doctor;
import com.example.doctorappointment.entity.Patient;
import com.example.doctorappointment.repository.DoctorRepository;
import com.example.doctorappointment.service.AppointmentService;
import com.example.doctorappointment.service.DoctorService;
import com.example.doctorappointment.service.PatientService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DatabaseSeeder implements CommandLineRunner {

    private final DoctorRepository doctorRepository;
    private final DoctorService doctorService;
    private final PatientService patientService;
    private final AppointmentService appointmentService;

    @Override
    public void run(String... args) throws Exception {
        log.info("DatabaseSeeder disabled — only user created doctors/patients will be present.");
    }
}

