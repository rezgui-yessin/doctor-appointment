import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'doctors',
    canActivate: [authGuard],
    loadComponent: () => import('./features/doctors/doctor-list/doctor-list.component').then((m) => m.DoctorListComponent),
  },
  {
    path: 'doctors/new',
    canActivate: [roleGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () => import('./features/doctors/doctor-form/doctor-form.component').then((m) => m.DoctorFormComponent),
  },
  {
    path: 'doctors/:id/edit',
    canActivate: [roleGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () => import('./features/doctors/doctor-form/doctor-form.component').then((m) => m.DoctorFormComponent),
  },
  {
    path: 'my-profile',
    canActivate: [roleGuard],
    data: { roles: ['PATIENT', 'DOCTOR'] },
    loadComponent: () => import('./features/profile/profile-container.component').then((m) => m.ProfileContainerComponent),
  },
  {
    path: 'book',
    canActivate: [roleGuard],
    data: { roles: ['PATIENT'] },
    loadComponent: () => import('./features/appointments/booking/booking.component').then((m) => m.BookingComponent),
  },
  {
    path: 'appointments',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/appointments/appointment-list/appointment-list.component').then(
        (m) => m.AppointmentListComponent
      ),
  },
  {
    path: 'doctor/dashboard',
    canActivate: [roleGuard],
    data: { roles: ['DOCTOR', 'ADMIN'] },
    loadComponent: () => import('./features/doctors/doctor-dashboard/doctor-dashboard.component').then((m) => m.DoctorDashboardComponent),
  },
  {
    path: 'doctor/patients',
    canActivate: [roleGuard],
    data: { roles: ['DOCTOR', 'ADMIN'] },
    loadComponent: () => import('./features/doctors/patient-folders/patient-folders.component').then((m) => m.PatientFoldersComponent),
  },
  { path: '**', redirectTo: 'dashboard' },
];
