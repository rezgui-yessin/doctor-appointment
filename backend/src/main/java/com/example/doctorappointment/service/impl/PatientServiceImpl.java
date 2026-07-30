package com.example.doctorappointment.service.impl;

import com.example.doctorappointment.dto.request.PatientRequestDTO;
import com.example.doctorappointment.dto.response.PatientResponseDTO;
import com.example.doctorappointment.entity.Patient;
import com.example.doctorappointment.exception.DuplicateResourceException;
import com.example.doctorappointment.exception.ResourceNotFoundException;
import com.example.doctorappointment.mapper.PatientMapper;
import com.example.doctorappointment.repository.PatientRepository;
import com.example.doctorappointment.repository.UserRepository;
import com.example.doctorappointment.service.PatientService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PatientServiceImpl implements PatientService {

    private final PatientRepository patientRepository;
    private final PatientMapper patientMapper;

    private final UserRepository userRepository;

    @Override
    @Transactional
    public PatientResponseDTO create(PatientRequestDTO request) {
        if (patientRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException("A patient with this email already exists");
        }
        Patient patient = patientMapper.toEntity(request);
        Patient saved = patientRepository.save(patient);

        userRepository.findByEmail(request.email()).ifPresent(user -> {
            user.setPatientId(saved.getId());
            userRepository.save(user);
        });

        return patientMapper.toDto(saved);
    }

    @Override
    public PatientResponseDTO getById(Long id) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + id));
        return patientMapper.toDto(patient);
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public PatientResponseDTO getMyProfile() {
        var currentUser = com.example.doctorappointment.security.SecurityUtils.getCurrentUser();
        if (currentUser == null) {
            throw new ResourceNotFoundException("No authenticated user found");
        }
        String email = currentUser.getUsername();

        // Try by email first
        java.util.Optional<Patient> byEmail = patientRepository.findByEmail(email);
        if (byEmail.isPresent()) {
            Patient p = byEmail.get();
            // Also ensure the User.patientId is linked
            linkPatientToUser(email, p.getId(), currentUser.getPatientId());
            return patientMapper.toDto(p);
        }

        // Try by stored patientId
        if (currentUser.getPatientId() != null) {
            return patientRepository.findById(currentUser.getPatientId())
                    .map(patientMapper::toDto)
                    .orElseGet(() -> autoCreatePatient(email));
        }

        // No patient profile at all → auto-create one
        return autoCreatePatient(email);
    }

    private PatientResponseDTO autoCreatePatient(String email) {
        // Derive display name from email
        String name = email.contains("@")
                ? java.util.Arrays.stream(email.substring(0, email.indexOf('@')).split("[._-]"))
                    .filter(p -> !p.isBlank())
                    .map(p -> Character.toUpperCase(p.charAt(0)) + p.substring(1))
                    .collect(java.util.stream.Collectors.joining(" "))
                : email;

        Patient patient = patientRepository.save(Patient.builder()
                .fullName(name)
                .email(email)
                .phone("555-0100")
                .build());

        // Link patientId on the User row
        userRepository.findByEmail(email).ifPresent(user -> {
            user.setPatientId(patient.getId());
            userRepository.save(user);
        });

        return patientMapper.toDto(patient);
    }

    private void linkPatientToUser(String email, Long patientId, Long currentLinkedId) {
        if (currentLinkedId == null || !currentLinkedId.equals(patientId)) {
            userRepository.findByEmail(email).ifPresent(user -> {
                user.setPatientId(patientId);
                userRepository.save(user);
            });
        }
    }

    @Override
    public List<PatientResponseDTO> getAll() {
        return patientRepository.findAll().stream()
                .map(patientMapper::toDto)
                .toList();
    }

    @Override
    @Transactional
    public PatientResponseDTO update(Long id, PatientRequestDTO request) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + id));

        patient.setFullName(request.fullName());
        patient.setEmail(request.email());
        patient.setPhone(request.phone());
        patient.setDateOfBirth(request.dateOfBirth());
        patient.setPhotoUrl(request.photoUrl());

        return patientMapper.toDto(patientRepository.save(patient));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!patientRepository.existsById(id)) {
            throw new ResourceNotFoundException("Patient not found with id: " + id);
        }
        patientRepository.deleteById(id);
    }
}
