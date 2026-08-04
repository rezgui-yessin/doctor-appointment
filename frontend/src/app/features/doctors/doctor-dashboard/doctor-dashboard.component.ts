import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AppointmentService } from '../../../core/services/appointment.service';
import { DoctorService } from '../../../core/services/doctor.service';
import { UploadService } from '../../../core/services/upload.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { Appointment, AppointmentStatus } from '../../../core/models/appointment.model';
import { Doctor } from '../../../core/models/doctor.model';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SpinnerComponent],
  templateUrl: './doctor-dashboard.component.html',
  styleUrl: './doctor-dashboard.component.scss',
})
export class DoctorDashboardComponent implements OnInit {
  doctor = signal<Doctor | null>(null);
  appointments = signal<Appointment[]>([]);
  loading = signal(false);
  
  // Status filter
  statusFilter = signal<string>('ALL');

  // PDF Upload Modal State
  uploadModalApp = signal<Appointment | null>(null);
  selectedPdfFile: File | null = null;
  uploadingPdf = signal(false);

  constructor(
    private appointmentService: AppointmentService,
    private doctorService: DoctorService,
    private uploadService: UploadService,
    private toast: ToastService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadDoctorProfileAndAppointments();
  }

  loadDoctorProfileAndAppointments(): void {
    this.loading.set(true);

    this.doctorService.getMyProfile().subscribe({
      next: (doc) => {
        this.doctor.set(doc);
        this.fetchAppointments(doc.id);
      },
      error: () => {
        // Fallback: check stored doctor ID
        const docId = this.doctorService.getMyDoctorId();
        if (docId) {
          this.fetchAppointments(docId);
        } else {
          this.loading.set(false);
          this.toast.show('Could not identify doctor profile.', 'error');
        }
      }
    });
  }

  private fetchAppointments(doctorId: number): void {
    this.appointmentService.forDoctor(doctorId, 0, 100).subscribe({
      next: (page) => {
        this.appointments.set(page.content || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.show('Failed to fetch doctor appointments.', 'error');
      }
    });
  }

  filteredAppointments(): Appointment[] {
    const list = this.appointments();
    const filter = this.statusFilter();
    if (filter === 'ALL') return list;
    return list.filter((a) => a.status === filter);
  }

  updateStatus(app: Appointment, newStatus: string): void {
    this.appointmentService.updateStatus(app.id, newStatus as AppointmentStatus).subscribe({
      next: (updated) => {
        this.appointments.update((prev) =>
          prev.map((item) => (item.id === app.id ? { ...item, status: updated.status } : item))
        );
        this.toast.show(`Appointment #${app.id} marked as ${newStatus}`, 'success');
      },
      error: () => {
        this.toast.show('Failed to update appointment status.', 'error');
      }
    });
  }

  openPdfUpload(app: Appointment): void {
    this.uploadModalApp.set(app);
    this.selectedPdfFile = null;
  }

  closePdfModal(): void {
    this.uploadModalApp.set(null);
    this.selectedPdfFile = null;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.type !== 'application/pdf') {
        this.toast.show('Please select a valid PDF document.', 'error');
        return;
      }
      this.selectedPdfFile = file;
    }
  }

  submitPdfUpload(): void {
    const app = this.uploadModalApp();
    if (!app || !this.selectedPdfFile) {
      this.toast.show('Please choose a PDF file first.', 'error');
      return;
    }

    this.uploadingPdf.set(true);
    this.uploadService.uploadConsultationPdf(this.selectedPdfFile, app.id).subscribe({
      next: (res) => {
        this.uploadingPdf.set(false);
        this.toast.show('Consultation PDF report uploaded successfully!', 'success');
        
        // Update local appointment state with PDF URL
        this.appointments.update((prev) =>
          prev.map((item) => (item.id === app.id ? { ...item, consultationPdfUrl: res.url } : item))
        );
        this.closePdfModal();
      },
      error: (err) => {
        this.uploadingPdf.set(false);
        const msg = err.error?.error || 'Failed to upload consultation PDF.';
        this.toast.show(msg, 'error');
      }
    });
  }

  get stats() {
    const all = this.appointments();
    return {
      total: all.length,
      pending: all.filter((a) => a.status === 'PENDING').length,
      confirmed: all.filter((a) => a.status === 'CONFIRMED').length,
      completed: all.filter((a) => a.status === 'COMPLETED').length,
      cancelled: all.filter((a) => a.status === 'CANCELLED').length,
    };
  }
}
