export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface Appointment {
  id: number;
  doctorId: number;
  doctorName?: string;
  patientId: number;
  patientName?: string;
  date: string;
  startTime: string;
  endTime?: string;
  status: AppointmentStatus;
  reason?: string;
}

export interface AppointmentRequest {
  doctorId: number;
  patientId: number;
  date: string;
  startTime: string;
  reason?: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
