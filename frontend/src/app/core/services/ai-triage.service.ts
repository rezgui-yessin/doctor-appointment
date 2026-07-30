import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TriageRequest {
  symptoms: string;
}

export interface AvailableSlot {
  time: string;
}

export interface DoctorSuggestion {
  doctorId: number;
  doctorName: string;
  specialization: string;
  availableSlots: { [date: string]: AvailableSlot[] };
}

export interface TriageResponse {
  recommendation: string;
  suggestedSpecialization: string;
  doctors: DoctorSuggestion[];
}

@Injectable({ providedIn: 'root' })
export class AiTriageService {
  private readonly base = '/api/ai';

  constructor(private http: HttpClient) {}

  triage(payload: TriageRequest): Observable<TriageResponse> {
    return this.http.post<TriageResponse>(`${this.base}/triage`, payload);
  }
}
