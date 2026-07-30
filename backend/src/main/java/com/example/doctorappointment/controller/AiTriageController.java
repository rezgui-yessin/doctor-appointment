package com.example.doctorappointment.controller;

import com.example.doctorappointment.dto.request.TriageRequestDTO;
import com.example.doctorappointment.dto.response.TriageResponseDTO;
import com.example.doctorappointment.service.AiTriageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiTriageController {

    private final AiTriageService aiTriageService;

    @PostMapping("/triage")
    @PreAuthorize("hasAnyRole('PATIENT', 'ADMIN')")
    public ResponseEntity<TriageResponseDTO> triageSymptoms(@Valid @RequestBody TriageRequestDTO request) {
        return ResponseEntity.ok(aiTriageService.processTriage(request));
    }
}
