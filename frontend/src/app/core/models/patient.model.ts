export interface Patient {
  id: number;
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
}

export interface PatientRequest {
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
}
