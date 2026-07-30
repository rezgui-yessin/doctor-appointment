import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UploadResult {
  url: string;
}

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  private base = '/api/upload';

  constructor(private http: HttpClient) {}

  /**
   * Upload a patient/doctor profile photo.
   * @param file  Image file (JPEG, PNG, WebP)
   * @param entityId  Patient email or ID used for naming on Cloudinary
   */
  uploadPhoto(file: File, entityId: string = 'unknown'): Observable<UploadResult> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('entityId', entityId);
    return this.http.post<UploadResult>(`${this.base}/photo`, fd);
  }

  /**
   * Upload a consultation PDF for a given appointment.
   * @param file          PDF file
   * @param appointmentId The appointment ID
   */
  uploadConsultationPdf(file: File, appointmentId: string | number): Observable<UploadResult> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<UploadResult>(`${this.base}/consultation/${appointmentId}`, fd);
  }

  /**
   * Upload a generic patient document (lab result, X-ray, report…).
   * @param file       The document file
   * @param patientId  Patient ID
   * @param docType    Short descriptor: 'labresult' | 'xray' | 'prescription' | 'report'
   */
  uploadPatientDocument(
    file: File,
    patientId: string | number,
    docType: string = 'document'
  ): Observable<UploadResult> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('docType', docType);
    return this.http.post<UploadResult>(`${this.base}/document/${patientId}`, fd);
  }
}
