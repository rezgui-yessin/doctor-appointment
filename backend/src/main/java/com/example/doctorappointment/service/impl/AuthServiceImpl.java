package com.example.doctorappointment.service.impl;

import com.example.doctorappointment.dto.request.AuthRequestDTO;
import com.example.doctorappointment.dto.response.AuthResponseDTO;
import com.example.doctorappointment.entity.User;
import com.example.doctorappointment.entity.enums.Role;
import com.example.doctorappointment.exception.DuplicateResourceException;
import com.example.doctorappointment.repository.UserRepository;
import com.example.doctorappointment.security.JwtUtil;
import com.example.doctorappointment.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.doctorappointment.entity.Doctor;
import com.example.doctorappointment.entity.Patient;
import com.example.doctorappointment.repository.DoctorRepository;
import com.example.doctorappointment.repository.PatientRepository;

import java.time.LocalTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    @Override
    @Transactional
    public AuthResponseDTO register(AuthRequestDTO.RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException("An account with this email already exists");
        }

        Role role = Role.valueOf(request.role().toUpperCase());

        User user = User.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .role(role)
                .build();

        if (role == Role.DOCTOR) {
            Doctor doctor = doctorRepository.findByEmail(request.email())
                    .orElseGet(() -> doctorRepository.save(Doctor.builder()
                            .fullName("Dr. " + deriveName(request.email()))
                            .email(request.email())
                            .specialization("General Practice")
                            .phone("555-0100")
                            .workingDays("MON,TUE,WED,THU,FRI")
                            .startTime("08:00")
                            .endTime("17:00")
                            .build()));
            user.setDoctorId(doctor.getId());
        } else if (role == Role.PATIENT) {
            Patient patient = patientRepository.findByEmail(request.email())
                    .orElseGet(() -> patientRepository.save(Patient.builder()
                            .fullName(deriveName(request.email()))
                            .email(request.email())
                            .phone("555-0100")
                            .build()));
            user.setPatientId(patient.getId());
        }

        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), Map.of("role", role.name()));
        return new AuthResponseDTO(token, user.getEmail(), role.name(), user.getPatientId(), user.getDoctorId());
    }

    @Override
    public AuthResponseDTO login(AuthRequestDTO.LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password()));

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalStateException("User not found after authentication"));

        // If user is a Doctor but doctorId is not set, link it if profile exists
        if (user.getRole() == Role.DOCTOR && user.getDoctorId() == null) {
            doctorRepository.findByEmail(user.getEmail()).ifPresent(doc -> {
                user.setDoctorId(doc.getId());
                userRepository.save(user);
            });
        }
        // If user is a Patient but patientId is not set, link it if profile exists
        if (user.getRole() == Role.PATIENT && user.getPatientId() == null) {
            patientRepository.findByEmail(user.getEmail()).ifPresent(pat -> {
                user.setPatientId(pat.getId());
                userRepository.save(user);
            });
        }

        String token = jwtUtil.generateToken(user.getEmail(), Map.of("role", user.getRole().name()));
        return new AuthResponseDTO(token, user.getEmail(), user.getRole().name(), user.getPatientId(), user.getDoctorId());
    }

    private String deriveName(String email) {
        if (email == null || !email.contains("@")) return "User";
        String prefix = email.substring(0, email.indexOf('@'));
        String[] parts = prefix.split("[._-]");
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (!p.isBlank()) {
                sb.append(Character.toUpperCase(p.charAt(0)))
                  .append(p.substring(1))
                  .append(" ");
            }
        }
        return sb.toString().trim();
    }
}
