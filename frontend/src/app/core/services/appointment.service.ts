import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Appointment, AppointmentRequest, AppointmentStatus, AvailableSlot, Page, TimeSlot } from '../models/appointment.model';
import { PatientFolder } from '../models/patient-folder.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private readonly base = `${environment.apiUrl}/appointments`;

  constructor(private http: HttpClient) {}

  book(payload: AppointmentRequest): Observable<Appointment> {
    return this.http.post<Appointment>(this.base, payload);
  }

  getById(id: number): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.base}/${id}`);
  }

  /** Returns available time slots as AvailableSlot[] from backend */
  availableSlots(doctorId: number, date: string): Observable<AvailableSlot[]> {
    const params = new HttpParams().set('doctorId', doctorId).set('date', date);
    return this.http.get<AvailableSlot[]>(`${this.base}/available-slots`, { params });
  }

  /** Converts AvailableSlot[] into TimeSlot[] for booking UI */
  availableSlotsAsTimeSlots(doctorId: number, date: string): Observable<TimeSlot[]> {
    return this.availableSlots(doctorId, date).pipe(
      map(slots => slots.map(s => ({ startTime: s.time, available: true })))
    );
  }

  /** Get all appointments for the currently logged-in patient (no ID needed) */
  forMe(page = 0, size = 100): Observable<Appointment[]> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<Appointment>>(`${this.base}/mine`, { params }).pipe(
      map(p => p.content)
    );
  }

  forPatient(patientId: number, page = 0, size = 100): Observable<Appointment[]> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<Appointment>>(`${this.base}/patient/${patientId}`, { params }).pipe(
      map(p => p.content)
    );
  }

  forDoctor(doctorId: number, page = 0, size = 10): Observable<Page<Appointment>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<Appointment>>(`${this.base}/doctor/${doctorId}`, { params });
  }

  patientFolders(doctorId: number): Observable<PatientFolder[]> {
    return this.http.get<PatientFolder[]>(`${this.base}/doctor/${doctorId}/patients`);
  }

  createPatientFolder(doctorId: number, payload: import('../models/patient-folder.model').CreatePatientFolderRequest): Observable<PatientFolder> {
    return this.http.post<PatientFolder>(`${this.base}/doctor/${doctorId}/patients`, payload);
  }

  updateStatus(id: number, status: AppointmentStatus): Observable<Appointment> {
    const params = new HttpParams().set('status', status);
    return this.http.patch<Appointment>(`${this.base}/${id}/status`, {}, { params });
  }

  cancel(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  /** Helper: combine date (YYYY-MM-DD) and time (HH:mm) into LocalDateTime string */
  static toLocalDateTime(date: string, time: string): string {
    return `${date}T${time}:00`;
  }

  /** Helper: extract date from appointmentTime ISO string */
  static extractDate(appointmentTime: string): string {
    return appointmentTime ? appointmentTime.substring(0, 10) : '';
  }

  /** Helper: extract time HH:mm from appointmentTime ISO string */
  static extractTime(appointmentTime: string): string {
    return appointmentTime ? appointmentTime.substring(11, 16) : '';
  }
}
