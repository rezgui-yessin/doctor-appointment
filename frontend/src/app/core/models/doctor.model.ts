export interface Doctor {
  id: number;
  fullName: string;
  specialization: string;
  email?: string;
  phone?: string;
  workingDays?: string;
  startTime?: string;
  endTime?: string;
  photoUrl?: string;
}

export interface DoctorRequest {
  fullName: string;
  specialization: string;
  email?: string;
  phone?: string;
  workingDays?: string;
  startTime?: string;
  endTime?: string;
  photoUrl?: string;
}
