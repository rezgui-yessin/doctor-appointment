export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

/** Matches the backend AppointmentResponseDTO */
export interface Appointment {
  id: number;
  doctorId: number;
  doctorName?: string;
  patientId: number;
  patientName?: string;
  appointmentTime: string;   // ISO-8601 LocalDateTime from backend e.g. "2026-07-25T09:00:00"
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  consultationPdfUrl?: string;
}

/** Matches the backend AppointmentRequestDTO */
export interface AppointmentRequest {
  doctorId: number;
  patientId: number;
  appointmentTime: string;  // ISO-8601 LocalDateTime e.g. "2026-07-25T09:00:00"
  reason?: string;
}

/** Matches the backend AvailableSlotDTO(time) */
export interface AvailableSlot {
  time: string; // "09:00"
}

/** Legacy TimeSlot used in booking UI */
export interface TimeSlot {
  startTime: string;
  available: boolean;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
