import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Doctor, DoctorRequest } from '../models/doctor.model';
import { environment } from '../../../environments/environment';

const DOCTOR_ID_KEY = 'chartwell_doctor_id';

@Injectable({ providedIn: 'root' })
export class DoctorService {
  private readonly base = `${environment.apiUrl}/doctors`;

  constructor(private http: HttpClient) {}

  /** Local pointer to which doctor record this browser is signed in as */
  getMyDoctorId(): number | null {
    const stored = localStorage.getItem(DOCTOR_ID_KEY);
    return stored ? Number(stored) : null;
  }

  setMyDoctorId(id: number): void {
    localStorage.setItem(DOCTOR_ID_KEY, String(id));
  }

  clearMyDoctorId(): void {
    localStorage.removeItem(DOCTOR_ID_KEY);
  }

  list(specialization?: string): Observable<Doctor[]> {
    let params = new HttpParams();
    if (specialization) params = params.set('specialization', specialization);
    return this.http.get<Doctor[]>(this.base, { params });
  }

  get(id: number): Observable<Doctor> {
    return this.http.get<Doctor>(`${this.base}/${id}`);
  }

  getMyProfile(): Observable<Doctor> {
    return this.http.get<Doctor>(`${this.base}/me`).pipe(
      tap((d) => {
        if (d?.id) this.setMyDoctorId(d.id);
      })
    );
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

  /** Returns a fallback avatar URL based on doctor id */
  static fallbackAvatar(doctorId: number): string {
    const avatars = [
      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&q=80&auto=format&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&q=80&auto=format&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200&h=200&q=80&auto=format&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200&h=200&q=80&auto=format&fit=crop&crop=face',
    ];
    return avatars[doctorId % avatars.length];
  }

  /** Returns doctor photo URL or fallback */
  static avatarFor(doctor: Doctor): string {
    return doctor.photoUrl || DoctorService.fallbackAvatar(doctor.id);
  }

  /** Generate initials for fallback avatar text */
  static initials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('');
  }
}
