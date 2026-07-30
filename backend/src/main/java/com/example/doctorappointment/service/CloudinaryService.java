package com.example.doctorappointment.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * Service that handles all file uploads to Cloudinary.
 * - Profile photos → folder: doctor-appointments/profiles
 * - Consultation PDFs → folder: doctor-appointments/consultations
 * - Patient documents → folder: doctor-appointments/patient-docs
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryService {

    private final Cloudinary cloudinary;

    private static final String BASE_FOLDER = "doctor-appointments";

    /**
     * Upload a profile photo (image) for a patient or doctor.
     *
     * @param file      the image file (JPEG, PNG, WebP)
     * @param entityId  identifier used to name the file (e.g. patient ID or email)
     * @return the public Cloudinary HTTPS URL of the uploaded image
     */
    public String uploadProfilePhoto(MultipartFile file, String entityId) throws IOException {
        Map<?, ?> result = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "folder", BASE_FOLDER + "/profiles",
                        "public_id", "profile_" + entityId,
                        "overwrite", true,
                        "resource_type", "image",
                        "transformation", "c_fill,g_face,w_400,h_400,q_auto,f_auto"
                )
        );
        String url = (String) result.get("secure_url");
        log.info("Uploaded profile photo for {} → {}", entityId, url);
        return url;
    }

    /**
     * Upload a consultation PDF for a patient appointment.
     *
     * @param file          the PDF file
     * @param appointmentId the appointment identifier used to name the file
     * @return the public Cloudinary HTTPS URL of the uploaded PDF
     */
    public String uploadConsultationPdf(MultipartFile file, String appointmentId) throws IOException {
        Map<?, ?> result = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "folder", BASE_FOLDER + "/consultations",
                        "public_id", "consultation_" + appointmentId,
                        "overwrite", true,
                        "resource_type", "raw"   // PDFs must use "raw"
                )
        );
        String url = (String) result.get("secure_url");
        log.info("Uploaded consultation PDF for appointment {} → {}", appointmentId, url);
        return url;
    }

    /**
     * Upload a generic patient document (lab results, X-rays as image or PDF, etc.).
     *
     * @param file      the document file
     * @param patientId the patient identifier
     * @param docType   a short label for the document type (e.g. "labresult", "xray")
     * @return the public Cloudinary HTTPS URL of the uploaded document
     */
    public String uploadPatientDocument(MultipartFile file, String patientId, String docType) throws IOException {
        String contentType = file.getContentType() != null ? file.getContentType() : "";
        boolean isPdf = contentType.equals("application/pdf");

        Map<?, ?> result = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "folder", BASE_FOLDER + "/patient-docs/" + patientId,
                        "public_id", docType + "_" + System.currentTimeMillis(),
                        "overwrite", false,
                        "resource_type", isPdf ? "raw" : "auto"
                )
        );
        String url = (String) result.get("secure_url");
        log.info("Uploaded {} document for patient {} → {}", docType, patientId, url);
        return url;
    }

    /**
     * Delete a file from Cloudinary by its public_id.
     *
     * @param publicId   the Cloudinary public_id of the resource to delete
     * @param resourceType "image" or "raw"
     */
    public void delete(String publicId, String resourceType) {
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", resourceType));
            log.info("Deleted Cloudinary resource: {}", publicId);
        } catch (IOException e) {
            log.warn("Could not delete Cloudinary resource {}: {}", publicId, e.getMessage());
        }
    }
}
