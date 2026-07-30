package com.example.doctorappointment.service.impl;

import com.example.doctorappointment.security.CustomUserDetails;
import com.example.doctorappointment.security.SecurityUtils;
import org.springframework.security.access.AccessDeniedException;
import com.example.doctorappointment.dto.request.AppointmentRequestDTO;
import com.example.doctorappointment.dto.response.AppointmentResponseDTO;
import com.example.doctorappointment.dto.response.PatientFolderDTO;
import com.example.doctorappointment.entity.Appointment;
import com.example.doctorappointment.entity.Doctor;
import com.example.doctorappointment.entity.Patient;
import com.example.doctorappointment.entity.enums.AppointmentStatus;
import com.example.doctorappointment.exception.AppointmentConflictException;
import com.example.doctorappointment.exception.ResourceNotFoundException;
import com.example.doctorappointment.mapper.AppointmentMapper;
import com.example.doctorappointment.repository.AppointmentRepository;
import com.example.doctorappointment.repository.DoctorRepository;
import com.example.doctorappointment.repository.PatientRepository;
import com.example.doctorappointment.repository.UserRepository;
import com.example.doctorappointment.service.AppointmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentServiceImpl implements AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final AppointmentMapper appointmentMapper;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional
    public AppointmentResponseDTO bookAppointment(AppointmentRequestDTO request) {
        Doctor doctor = doctorRepository.findById(request.doctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with id: " + request.doctorId()));
        Patient patient = patientRepository.findById(request.patientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + request.patientId()));

        CustomUserDetails currentUser = SecurityUtils.getCurrentUser();
        if (currentUser != null && SecurityUtils.hasRole("PATIENT")) {
            Long myPatientId = currentUser.getPatientId();
            if (myPatientId != null && !patient.getId().equals(myPatientId)) {
                throw new AccessDeniedException("You can only book appointments for yourself");
            }
        }

        boolean conflict = appointmentRepository.existsByDoctorIdAndAppointmentTimeAndStatusNot(
                doctor.getId(), request.appointmentTime(), AppointmentStatus.CANCELLED);
        if (conflict) {
            throw new AppointmentConflictException(
                    "Doctor " + doctor.getFullName() + " already has an appointment at this time");
        }

        Appointment appointment = Appointment.builder()
                .doctor(doctor)
                .patient(patient)
                .appointmentTime(request.appointmentTime())
                .reason(request.reason())
                .status(AppointmentStatus.PENDING)
                .build();

        AppointmentResponseDTO savedDto = appointmentMapper.toDto(appointmentRepository.save(appointment));

        try {
            messagingTemplate.convertAndSend("/topic/appointments", savedDto);
            messagingTemplate.convertAndSend("/topic/appointments/doctor/" + doctor.getId(), savedDto);
        } catch (Exception ignored) {}

        return savedDto;
    }

    @Override
    public AppointmentResponseDTO getById(Long id) {
        Appointment appointment = findOrThrow(id);
        verifyOwnership(appointment);
        return appointmentMapper.toDto(appointment);
    }

    @Override
    @Transactional
    public Page<AppointmentResponseDTO> getByPatient(Long patientId, Pageable pageable) {
        CustomUserDetails currentUser = SecurityUtils.getCurrentUser();

        // PATIENT role: always resolve from identity, not from URL param
        if (currentUser != null && SecurityUtils.hasRole("PATIENT")) {
            String email = currentUser.getUsername();

            // 1. Try patientId from token
            Long myPatientId = currentUser.getPatientId();
            if (myPatientId != null) {
                return appointmentRepository.findByPatientId(myPatientId, pageable)
                        .map(appointmentMapper::toDto);
            }

            // 2. Try by email in Patient table
            java.util.Optional<com.example.doctorappointment.entity.Patient> byEmail = patientRepository.findByEmail(email);
            if (byEmail.isPresent()) {
                com.example.doctorappointment.entity.Patient patient = byEmail.get();
                // Link patientId on User row so future JWT tokens have it
                userRepository.findByEmail(email).ifPresent(user -> {
                    if (user.getPatientId() == null) {
                        user.setPatientId(patient.getId());
                        userRepository.save(user);
                    }
                });
                return appointmentRepository.findByPatientId(patient.getId(), pageable)
                        .map(appointmentMapper::toDto);
            }

            // 3. No patient yet → auto-create and link
            String name = email.contains("@")
                    ? java.util.Arrays.stream(email.substring(0, email.indexOf('@')).split("[._-]"))
                        .filter(p -> !p.isBlank())
                        .map(p -> Character.toUpperCase(p.charAt(0)) + p.substring(1))
                        .collect(java.util.stream.Collectors.joining(" "))
                    : email;

            com.example.doctorappointment.entity.Patient newPatient = patientRepository.save(
                    com.example.doctorappointment.entity.Patient.builder()
                            .fullName(name)
                            .email(email)
                            .phone("555-0100")
                            .build());

            userRepository.findByEmail(email).ifPresent(user -> {
                user.setPatientId(newPatient.getId());
                userRepository.save(user);
            });

            // New patient has no appointments yet
            return new org.springframework.data.domain.PageImpl<>(List.of(), pageable, 0);
        }

        if (patientId == null) {
            return new org.springframework.data.domain.PageImpl<>(List.of(), pageable, 0);
        }
        return appointmentRepository.findByPatientId(patientId, pageable)
                .map(appointmentMapper::toDto);
    }

    @Override
    public Page<AppointmentResponseDTO> getByDoctor(Long doctorId, Pageable pageable) {
        CustomUserDetails currentUser = SecurityUtils.getCurrentUser();
        if (currentUser != null && SecurityUtils.hasRole("DOCTOR")) {
            Long myDoctorId = currentUser.getDoctorId();
            if (myDoctorId != null && !doctorId.equals(myDoctorId)) {
                throw new AccessDeniedException("You do not have permission to access this doctor's appointments");
            }
        }
        return appointmentRepository.findByDoctorId(doctorId, pageable)
                .map(appointmentMapper::toDto);
    }

    @Override
    @Transactional
    public AppointmentResponseDTO updateStatus(Long id, AppointmentStatus status) {
        Appointment appointment = findOrThrow(id);
        verifyOwnership(appointment);
        appointment.setStatus(status);
        AppointmentResponseDTO savedDto = appointmentMapper.toDto(appointmentRepository.save(appointment));
        try {
            messagingTemplate.convertAndSend("/topic/appointments", savedDto);
            messagingTemplate.convertAndSend("/topic/appointments/doctor/" + appointment.getDoctor().getId(), savedDto);
        } catch (Exception ignored) {}
        return savedDto;
    }

    @Override
    @Transactional
    public void cancelAppointment(Long id) {
        Appointment appointment = findOrThrow(id);
        verifyOwnership(appointment);
        appointment.setStatus(AppointmentStatus.CANCELLED);
        AppointmentResponseDTO savedDto = appointmentMapper.toDto(appointmentRepository.save(appointment));
        try {
            messagingTemplate.convertAndSend("/topic/appointments", savedDto);
            messagingTemplate.convertAndSend("/topic/appointments/doctor/" + appointment.getDoctor().getId(), savedDto);
        } catch (Exception ignored) {}
    }

    private Appointment findOrThrow(Long id) {
        return appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found with id: " + id));
    }

    private void verifyOwnership(Appointment appointment) {
        CustomUserDetails currentUser = SecurityUtils.getCurrentUser();
        if (currentUser == null) return;
        if (SecurityUtils.hasRole("ADMIN")) return;

        if (SecurityUtils.hasRole("PATIENT")) {
            if (!appointment.getPatient().getId().equals(currentUser.getPatientId())) {
                throw new AccessDeniedException("You do not have permission to access this appointment");
            }
        } else if (SecurityUtils.hasRole("DOCTOR")) {
            if (!appointment.getDoctor().getId().equals(currentUser.getDoctorId())) {
                throw new AccessDeniedException("You do not have permission to access this appointment");
            }
        }
    }
    @Override
    public List<com.example.doctorappointment.dto.response.AvailableSlotDTO> getAvailableSlots(Long doctorId, java.time.LocalDate date) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with id: " + doctorId));

        String workingDays = doctor.getWorkingDays();
        if (workingDays == null) {
            return java.util.Collections.emptyList();
        }

        String dayStr = date.getDayOfWeek().name().substring(0, 3).toUpperCase();
        String workingDaysUpper = workingDays.toUpperCase();
        
        boolean isWorkingDay = workingDaysUpper.contains(dayStr);
        if (workingDaysUpper.equals("MON-FRI") || workingDaysUpper.equals("MONDAY-FRIDAY")) {
            int dayValue = date.getDayOfWeek().getValue(); // 1 (Mon) to 7 (Sun)
            isWorkingDay = dayValue >= 1 && dayValue <= 5;
        }

        if (!isWorkingDay) {
            return java.util.Collections.emptyList();
        }

        java.time.LocalTime start = java.time.LocalTime.parse(doctor.getStartTime());
        java.time.LocalTime end = java.time.LocalTime.parse(doctor.getEndTime());

        List<java.time.LocalTime> generatedSlots = new java.util.ArrayList<>();
        java.time.LocalTime current = start;
        while (current.isBefore(end)) {
            generatedSlots.add(current);
            current = current.plusMinutes(30);
        }

        List<Appointment> bookedAppointments = appointmentRepository.findByDoctorIdAndAppointmentTimeBetween(
                doctorId, date.atStartOfDay(), date.atTime(java.time.LocalTime.MAX)
        );

        List<java.time.LocalTime> bookedTimes = bookedAppointments.stream()
                .filter(a -> a.getStatus() != AppointmentStatus.CANCELLED)
                .map(a -> a.getAppointmentTime().toLocalTime())
                .toList();

        return generatedSlots.stream()
                .filter(slot -> !bookedTimes.contains(slot))
                .map(slot -> new com.example.doctorappointment.dto.response.AvailableSlotDTO(slot.toString()))
                .toList();
    }

    @Override
    public List<PatientFolderDTO> getPatientFoldersByDoctor(Long doctorId) {
        // Fetch all appointments for this doctor, newest first
        List<Appointment> all = appointmentRepository.findByDoctorIdOrderByAppointmentTimeDesc(doctorId);

        // Group appointments by patient ID
        Map<Long, List<Appointment>> byPatient = all.stream()
                .collect(Collectors.groupingBy(a -> a.getPatient().getId(), LinkedHashMap::new, Collectors.toList()));

        return byPatient.entrySet().stream()
                .map(entry -> {
                    List<Appointment> visits = entry.getValue();
                    Appointment latest = visits.get(0); // already sorted desc
                    Patient patient = latest.getPatient();
                    return new PatientFolderDTO(
                            patient.getId(),
                            patient.getFullName(),
                            patient.getEmail(),
                            patient.getPhone(),
                            patient.getPhotoUrl(),
                            visits.size(),
                            latest.getAppointmentTime(),
                            latest.getStatus().name()
                    );
                })
                .toList();
    }
}
