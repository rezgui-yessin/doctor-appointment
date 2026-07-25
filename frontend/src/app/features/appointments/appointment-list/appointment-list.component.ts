import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AppointmentService } from '../../../core/services/appointment.service';
import { DoctorService } from '../../../core/services/doctor.service';
import { PatientService } from '../../../core/services/patient.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Appointment, AppointmentStatus } from '../../../core/models/appointment.model';
import { Doctor } from '../../../core/models/doctor.model';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-appointment-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SpinnerComponent, ConfirmDialogComponent],
  templateUrl: './appointment-list.component.html',
  styleUrl: './appointment-list.component.scss',
})
export class AppointmentListComponent implements OnInit {
  appointments = signal<Appointment[]>([]);
  loading = signal(false);
  pendingCancel = signal<Appointment | null>(null);

  // doctor/admin view state
  doctors = signal<Doctor[]>([]);
  selectedDoctorId: number | null = null;
  page = signal(0);
  totalPages = signal(0);
  pageSize = 10;

  constructor(
    public auth: AuthService,
    private appointmentService: AppointmentService,
    private doctorService: DoctorService,
    private patientService: PatientService,
    private toast: ToastService
  ) {}

  get isPatientView(): boolean {
    return this.auth.role() === 'PATIENT';
  }

  ngOnInit(): void {
    if (this.isPatientView) {
      this.loadPatientAppointments();
    } else {
      this.loadDoctorOptions();
    }
  }

  private loadPatientAppointments(): void {
    const patientId = this.patientService.getMyPatientId();
    if (!patientId) return;
    this.loading.set(true);
    this.appointmentService.forPatient(patientId).subscribe({
      next: (list) => {
        this.appointments.set(this.sortByDateDesc(list));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadDoctorOptions(): void {
    this.doctorService.list().subscribe((docs) => {
      this.doctors.set(docs);
      const remembered = this.auth.role() === 'DOCTOR' ? this.doctorService.getMyDoctorId() : null;
      this.selectedDoctorId = remembered ?? docs[0]?.id ?? null;
      if (this.selectedDoctorId) this.loadDoctorSchedule();
    });
  }

  onDoctorPick(): void {
    if (this.auth.role() === 'DOCTOR' && this.selectedDoctorId) {
      this.doctorService.setMyDoctorId(this.selectedDoctorId);
    }
    this.page.set(0);
    this.loadDoctorSchedule();
  }

  loadDoctorSchedule(): void {
    if (!this.selectedDoctorId) return;
    this.loading.set(true);
    this.appointmentService.forDoctor(this.selectedDoctorId, this.page(), this.pageSize).subscribe({
      next: (res) => {
        this.appointments.set(this.sortByDateDesc(res.content));
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goToPage(p: number): void {
    if (p < 0 || p >= this.totalPages()) return;
    this.page.set(p);
    this.loadDoctorSchedule();
  }

  private sortByDateDesc(list: Appointment[]): Appointment[] {
    return [...list].sort((a, b) => (a.date + a.startTime < b.date + b.startTime ? 1 : -1));
  }

  setStatus(appt: Appointment, status: AppointmentStatus): void {
    this.appointmentService.updateStatus(appt.id, status).subscribe({
      next: (updated) => {
        this.appointments.update((list) => list.map((a) => (a.id === appt.id ? updated : a)));
        this.toast.show(`Marked ${status.toLowerCase()}.`, 'success');
      },
      error: () => this.toast.show('Could not update that appointment.', 'error'),
    });
  }

  confirmCancel(): void {
    const appt = this.pendingCancel();
    if (!appt) return;
    this.appointmentService.cancel(appt.id).subscribe({
      next: () => {
        this.appointments.update((list) => list.filter((a) => a.id !== appt.id));
        this.toast.show('Appointment cancelled.', 'success');
        this.pendingCancel.set(null);
      },
      error: () => {
        this.toast.show('Could not cancel this appointment.', 'error');
        this.pendingCancel.set(null);
      },
    });
  }
}
