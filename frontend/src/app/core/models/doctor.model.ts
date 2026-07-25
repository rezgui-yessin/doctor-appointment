export interface Doctor {
  id: number;
  fullName: string;
  specialization: string;
  email?: string;
  phone?: string;
  shiftStart?: string;
  shiftEnd?: string;
}

export interface DoctorRequest {
  fullName: string;
  specialization: string;
  email?: string;
  phone?: string;
  shiftStart?: string;
  shiftEnd?: string;
}
