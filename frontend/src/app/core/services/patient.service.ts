import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Patient, PatientRequest } from '../models/patient.model';
import { environment } from '../../../environments/environment';

const PATIENT_ID_KEY = 'chartwell_patient_id';

@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly base = `${environment.apiUrl}/patients`;

  constructor(private http: HttpClient) {}

  /** Local pointer to whichever patient record this browser has created —
   * see the note in patient-form.component.ts for why this exists. */
  getMyPatientId(): number | null {
    const stored = localStorage.getItem(PATIENT_ID_KEY);
    return stored ? Number(stored) : null;
  }

  setMyPatientId(id: number): void {
    localStorage.setItem(PATIENT_ID_KEY, String(id));
  }

  create(payload: PatientRequest): Observable<Patient> {
    return this.http.post<Patient>(this.base, payload);
  }

  get(id: number): Observable<Patient> {
    return this.http.get<Patient>(`${this.base}/${id}`);
  }

  getMyProfile(): Observable<Patient> {
    return this.http.get<Patient>(`${this.base}/me`).pipe(
      tap((p) => {
        if (p?.id) this.setMyPatientId(p.id);
      })
    );
  }

  update(id: number, payload: PatientRequest): Observable<Patient> {
    return this.http.put<Patient>(`${this.base}/${id}`, payload);
  }

  list(): Observable<Patient[]> {
    return this.http.get<Patient[]>(this.base);
  }
}
