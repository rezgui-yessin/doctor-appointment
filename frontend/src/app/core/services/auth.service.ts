import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthResponse, DecodedToken, LoginRequest, RegisterRequest, Role } from '../models/auth.model';

const TOKEN_KEY = 'chartwell_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = '/api/auth';

  /** Reactive signal of the decoded token, or null when logged out */
  readonly session = signal<DecodedToken | null>(this.decode(this.readToken()));
  readonly isAuthenticated = computed(() => !!this.session());
  readonly role = computed<Role | null>(() => this.session()?.role ?? null);
  readonly email = computed<string | null>(() => this.session()?.sub ?? null);

  constructor(private http: HttpClient) {}

  register(payload: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/register`, payload);
  }

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/login`, payload).pipe(
      tap((res) => this.setToken(res.token))
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.session.set(null);
  }

  getToken(): string | null {
    return this.readToken();
  }

  private setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.session.set(this.decode(token));
  }

  private readToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private decode(token: string | null): DecodedToken | null {
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      if (json.exp && Date.now() >= json.exp * 1000) {
        return null;
      }
      return json as DecodedToken;
    } catch {
      return null;
    }
  }
}
