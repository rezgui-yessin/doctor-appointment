export interface PatientFolder {
  patientId: number;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  patientPhotoUrl?: string;
  totalVisits: number;
  lastVisit: string;
  lastVisitStatus: string;
}

export interface CreatePatientFolderRequest {
  patientId?: number;
  fullName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  initialNotes?: string;
}
