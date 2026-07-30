export type Role = 'ADMIN' | 'DOCTOR' | 'PATIENT';

export interface RegisterRequest {
  email: string;
  password: string;
  role: Role;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  email?: string;
  role?: Role;
  patientId?: number;
  doctorId?: number;
}

export interface DecodedToken {
  sub: string;
  role: Role;
  userId?: number;
  exp: number;
  iat?: number;
}
