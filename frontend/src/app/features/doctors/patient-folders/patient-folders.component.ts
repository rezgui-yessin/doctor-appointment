import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../../../core/services/appointment.service';
import { DoctorService } from '../../../core/services/doctor.service';
import { PatientService } from '../../../core/services/patient.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { PatientFolder, CreatePatientFolderRequest } from '../../../core/models/patient-folder.model';
import { Appointment } from '../../../core/models/appointment.model';
import { Patient } from '../../../core/models/patient.model';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';

@Component({
  selector: 'app-patient-folders',
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerComponent],
  templateUrl: './patient-folders.component.html',
  styleUrl: './patient-folders.component.scss',
})
export class PatientFoldersComponent implements OnInit {
  folders = signal<PatientFolder[]>([]);
  filteredFolders = signal<PatientFolder[]>([]);
  loading = signal(false);
  searchTerm = '';
  
  // Selected Patient Details Modal
  selectedPatient = signal<PatientFolder | null>(null);
  patientAppointments = signal<Appointment[]>([]);
  loadingAppointments = signal(false);

  // Create Patient Folder Modal State
  createModalOpen = signal(false);
  creatingFolder = signal(false);
  loadingPatientsList = signal(false);
  systemPatients = signal<Patient[]>([]);

  // Create Mode: 'EXISTING' or 'NEW'
  createMode = signal<'EXISTING' | 'NEW'>('EXISTING');
  selectedPatientId = signal<number | null>(null);

  // New Folder Form Fields
  newPatientName = '';
  newPatientEmail = '';
  newPatientPhone = '';
  newPatientDob = '';
  newPatientNotes = '';

  constructor(
    private appointmentService: AppointmentService,
    private doctorService: DoctorService,
    private patientService: PatientService,
    public auth: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadPatientFolders();
  }

  loadPatientFolders(): void {
    this.loading.set(true);

    const docId = this.doctorService.getMyDoctorId();
    if (docId) {
      this.fetchFolders(docId);
    } else {
      this.doctorService.getMyProfile().subscribe({
        next: (profile) => {
          this.fetchFolders(profile.id);
        },
        error: () => {
          this.loading.set(false);
          this.toast.show('Could not retrieve doctor profile.', 'error');
        }
      });
    }
  }

  private fetchFolders(doctorId: number): void {
    this.appointmentService.patientFolders(doctorId).subscribe({
      next: (list) => {
        this.folders.set(list || []);
        this.applyFilter();
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.show('Failed to load patient medical folders.', 'error');
      }
    });
  }

  applyFilter(): void {
    const q = this.searchTerm.trim().toLowerCase();
    if (!q) {
      this.filteredFolders.set(this.folders());
      return;
    }
    const result = this.folders().filter((f) =>
      f.patientName?.toLowerCase().includes(q) ||
      f.patientEmail?.toLowerCase().includes(q) ||
      f.patientPhone?.toLowerCase().includes(q)
    );
    this.filteredFolders.set(result);
  }

  openPatientFolder(folder: PatientFolder): void {
    this.selectedPatient.set(folder);
    this.loadingAppointments.set(true);
    this.appointmentService.forPatient(folder.patientId, 0, 50).subscribe({
      next: (apps) => {
        this.patientAppointments.set(apps || []);
        this.loadingAppointments.set(false);
      },
      error: () => {
        this.patientAppointments.set([]);
        this.loadingAppointments.set(false);
      }
    });
  }

  closeModal(): void {
    this.selectedPatient.set(null);
    this.patientAppointments.set([]);
  }

  openCreateModal(): void {
    this.createModalOpen.set(true);
    this.loadSystemPatients();
  }

  loadSystemPatients(): void {
    this.loadingPatientsList.set(true);
    this.patientService.list().subscribe({
      next: (patients) => {
        this.systemPatients.set(patients || []);
        this.loadingPatientsList.set(false);
      },
      error: () => {
        this.loadingPatientsList.set(false);
      }
    });
  }

  closeCreateModal(): void {
    this.createModalOpen.set(false);
    this.resetCreateForm();
  }

  resetCreateForm(): void {
    this.createMode.set('EXISTING');
    this.selectedPatientId.set(null);
    this.newPatientName = '';
    this.newPatientEmail = '';
    this.newPatientPhone = '';
    this.newPatientDob = '';
    this.newPatientNotes = '';
  }

  submitCreateFolder(): void {
    const docId = this.doctorService.getMyDoctorId();
    if (!docId) {
      this.toast.show('Doctor profile not identified.', 'error');
      return;
    }

    let payload: CreatePatientFolderRequest;

    if (this.createMode() === 'EXISTING') {
      const patientId = this.selectedPatientId();
      if (!patientId) {
        this.toast.show('Please select a patient from the dropdown list.', 'error');
        return;
      }
      const existing = this.systemPatients().find(p => p.id === patientId);
      payload = {
        patientId,
        fullName: existing?.fullName,
        email: existing?.email,
        phone: existing?.phone,
        initialNotes: this.newPatientNotes.trim() || undefined
      };
    } else {
      if (!this.newPatientName.trim() || !this.newPatientEmail.trim()) {
        this.toast.show('Patient Name and Email are required for new registration.', 'error');
        return;
      }
      payload = {
        fullName: this.newPatientName.trim(),
        email: this.newPatientEmail.trim(),
        phone: this.newPatientPhone.trim() || undefined,
        dateOfBirth: this.newPatientDob || undefined,
        initialNotes: this.newPatientNotes.trim() || undefined
      };
    }

    this.creatingFolder.set(true);
    this.appointmentService.createPatientFolder(docId, payload).subscribe({
      next: (newFolder) => {
        this.creatingFolder.set(false);
        this.toast.show(`Medical folder assigned for ${newFolder.patientName}!`, 'success');
        this.closeCreateModal();
        this.loadPatientFolders();
      },
      error: (err) => {
        this.creatingFolder.set(false);
        const msg = err.error?.message || 'Failed to create/assign patient folder.';
        this.toast.show(msg, 'error');
      }
    });
  }

  avatarFor(folder: PatientFolder): string {
    if (folder.patientPhotoUrl) return folder.patientPhotoUrl;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(folder.patientName)}&background=0D8ABC&color=fff`;
  }
}
