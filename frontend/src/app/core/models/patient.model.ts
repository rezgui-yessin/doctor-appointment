export interface Patient {
  id: number;
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  photoUrl?: string;
}

export interface PatientRequest {
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  photoUrl?: string;
}
