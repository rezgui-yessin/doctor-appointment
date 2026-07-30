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
