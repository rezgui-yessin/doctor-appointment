import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Doctor, DoctorRequest } from '../models/doctor.model';

const DOCTOR_ID_KEY = 'chartwell_doctor_id';

@Injectable({ providedIn: 'root' })
export class DoctorService {
  private readonly base = '/api/doctors';

  constructor(private http: HttpClient) {}

  /** Local pointer to which doctor record this browser is signed in as —
   * the README's JWT doesn't expose a doctorId claim, so a doctor picks
   * their own listing once and it's remembered on this device. */
  getMyDoctorId(): number | null {
    const stored = localStorage.getItem(DOCTOR_ID_KEY);
    return stored ? Number(stored) : null;
  }

  setMyDoctorId(id: number): void {
    localStorage.setItem(DOCTOR_ID_KEY, String(id));
  }

  list(specialization?: string): Observable<Doctor[]> {
    let params = new HttpParams();
    if (specialization) params = params.set('specialization', specialization);
    return this.http.get<Doctor[]>(this.base, { params });
  }

  get(id: number): Observable<Doctor> {
    return this.http.get<Doctor>(`${this.base}/${id}`);
  }

  create(payload: DoctorRequest): Observable<Doctor> {
    return this.http.post<Doctor>(this.base, payload);
  }

  update(id: number, payload: DoctorRequest): Observable<Doctor> {
    return this.http.put<Doctor>(`${this.base}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
