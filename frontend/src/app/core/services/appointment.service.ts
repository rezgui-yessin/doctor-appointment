import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Appointment, AppointmentRequest, AppointmentStatus, Page, TimeSlot } from '../models/appointment.model';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private readonly base = '/api/appointments';

  constructor(private http: HttpClient) {}

  book(payload: AppointmentRequest): Observable<Appointment> {
    return this.http.post<Appointment>(this.base, payload);
  }

  availableSlots(doctorId: number, date: string): Observable<TimeSlot[]> {
    const params = new HttpParams().set('doctorId', doctorId).set('date', date);
    return this.http.get<TimeSlot[]>(`${this.base}/available-slots`, { params });
  }

  forPatient(patientId: number): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.base}/patient/${patientId}`);
  }

  forDoctor(doctorId: number, page = 0, size = 10): Observable<Page<Appointment>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<Appointment>>(`${this.base}/doctor/${doctorId}`, { params });
  }

  updateStatus(id: number, status: AppointmentStatus): Observable<Appointment> {
    const params = new HttpParams().set('status', status);
    return this.http.patch<Appointment>(`${this.base}/${id}/status`, {}, { params });
  }

  cancel(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
