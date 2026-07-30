package com.example.doctorappointment.controller;

import com.example.doctorappointment.service.CloudinaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

/**
 * Unified file upload controller backed by Cloudinary.
 *
 * Endpoints:
 *   POST /api/upload/photo               — profile photo (image)
 *   POST /api/upload/consultation/{id}   — consultation PDF for an appointment
 *   POST /api/upload/document/{patientId}— generic patient document
 */
@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
@Slf4j
public class FileUploadController {

    private final CloudinaryService cloudinaryService;

    private static final long MAX_IMAGE_SIZE = 5L * 1024 * 1024;   // 5 MB
    private static final long MAX_DOC_SIZE   = 20L * 1024 * 1024;  // 20 MB

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif"
    );
    private static final Set<String> ALLOWED_DOC_TYPES = Set.of(
            "application/pdf",
            "image/jpeg", "image/png", "image/webp",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    // ─────────────────────────────────────────────────────────────
    // 1. Profile photo upload
    // ─────────────────────────────────────────────────────────────
    @PostMapping("/photo")
    public ResponseEntity<Map<String, String>> uploadPhoto(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "entityId", defaultValue = "unknown") String entityId) {

        if (file.isEmpty()) return bad("No file provided");
        if (file.getSize() > MAX_IMAGE_SIZE) return bad("File exceeds 5 MB limit");
        String ct = file.getContentType();
        if (ct == null || !ALLOWED_IMAGE_TYPES.contains(ct)) return bad("Unsupported type — use JPEG, PNG, WebP or GIF");

        try {
            String url = cloudinaryService.uploadProfilePhoto(file, entityId);
            return ResponseEntity.ok(Map.of("url", url));
        } catch (IOException e) {
            log.error("Photo upload failed", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Upload failed: " + e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Consultation PDF upload
    // ─────────────────────────────────────────────────────────────
    @PostMapping("/consultation/{appointmentId}")
    public ResponseEntity<Map<String, String>> uploadConsultationPdf(
            @PathVariable String appointmentId,
            @RequestParam("file") MultipartFile file) {

        if (file.isEmpty()) return bad("No file provided");
        if (file.getSize() > MAX_DOC_SIZE) return bad("File exceeds 20 MB limit");
        String ct = file.getContentType();
        if (ct == null || !ct.equals("application/pdf")) return bad("Only PDF files are accepted for consultations");

        try {
            String url = cloudinaryService.uploadConsultationPdf(file, appointmentId);
            return ResponseEntity.ok(Map.of("url", url));
        } catch (IOException e) {
            log.error("Consultation PDF upload failed", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Upload failed: " + e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Generic patient document upload
    // ─────────────────────────────────────────────────────────────
    @PostMapping("/document/{patientId}")
    public ResponseEntity<Map<String, String>> uploadPatientDocument(
            @PathVariable String patientId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "docType", defaultValue = "document") String docType) {

        if (file.isEmpty()) return bad("No file provided");
        if (file.getSize() > MAX_DOC_SIZE) return bad("File exceeds 20 MB limit");
        String ct = file.getContentType();
        if (ct == null || !ALLOWED_DOC_TYPES.contains(ct)) return bad("Unsupported document type");

        try {
            String url = cloudinaryService.uploadPatientDocument(file, patientId, docType);
            return ResponseEntity.ok(Map.of("url", url));
        } catch (IOException e) {
            log.error("Patient document upload failed", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Upload failed: " + e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Helper
    // ─────────────────────────────────────────────────────────────
    private ResponseEntity<Map<String, String>> bad(String msg) {
        return ResponseEntity.badRequest().body(Map.of("error", msg));
    }
}
