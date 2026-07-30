import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AppointmentService } from '../../core/services/appointment.service';
import { DoctorService } from '../../core/services/doctor.service';
import { PatientService } from '../../core/services/patient.service';
import { AiTriageService, TriageResponse, AvailableSlot } from '../../core/services/ai-triage.service';
import { ToastService } from '../../core/services/toast.service';
import { Appointment, AppointmentStatus, AvailableSlot as AppointmentAvailableSlot } from '../../core/models/appointment.model';
import { Doctor } from '../../core/models/doctor.model';
import { Patient } from '../../core/models/patient.model';
import { PatientFolder } from '../../core/models/patient-folder.model';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { WebSocketService } from '../../core/services/websocket.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SpinnerComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  today = new Date();
  formattedToday = '';

  // Role details
  role = signal<'ADMIN' | 'DOCTOR' | 'PATIENT' | null>(null);
  loading = signal(false);

  // --- PATIENT STATE ---
  patientProfile = signal<Patient | null>(null);
  patientAppointments = signal<Appointment[]>([]);
  noProfileAlert = signal(false);

  // Directory filter state
  doctorsList = signal<Doctor[]>([]);
  doctorSearchQuery = signal<string>('');
  doctorFilterSpecialty = signal<string>('');

  // Symptom Triage State
  symptomsText = signal('');
  triageLoading = signal(false);
  triageResult = signal<TriageResponse | null>(null);

  // Manual Quick Booking State
  bookingDoctorId = signal<number | null>(null);
  bookingDate = signal<string>('');
  bookingSlots = signal<AppointmentAvailableSlot[]>([]);
  bookingSlotTime = signal<string | null>(null);
  bookingSlotsLoading = signal(false);
  bookingSaving = signal(false);
  bookingReason = signal('');

  // --- DOCTOR STATE ---
  doctorAppointments = signal<Appointment[]>([]);
  doctorProfile = signal<Doctor | null>(null);
  doctorFilter = signal<'TODAY' | 'ALL' | 'PENDING'>('TODAY');
  unclaimedDoctorId = signal<number | null>(null);
  
  // Patient Folders side-panel state
  patientFolders = signal<PatientFolder[]>([]);
  selectedFolder = signal<PatientFolder | null>(null);
  patientSearchQuery = signal<string>('');

  // --- ADMIN STATE ---
  adminDoctors = signal<Doctor[]>([]);
  adminDoctorsList = signal<Doctor[]>([]);
  adminPatientsList = signal<Patient[]>([]);
  adminAppointments = signal<Appointment[]>([]);
  doctorsCount = signal(0);
  patientsCount = signal(0);
  totalAppointmentsCount = signal(0);
  adminPendingCount = signal(0);
  quickAddDoctorOpen = signal(false);

  // New Doctor Form State
  newDocName = '';
  newDocSpecialization = '';
  newDocEmail = '';
  newDocPhone = '';
  newDocShiftStart = '09:00';
  newDocShiftEnd = '17:00';
  quickDocSaving = signal(false);

  constructor(
    public auth: AuthService,
    private appointmentService: AppointmentService,
    private doctorService: DoctorService,
    private patientService: PatientService,
    private aiTriageService: AiTriageService,
    private toast: ToastService,
    private wsService: WebSocketService
  ) {
    this.formattedToday = this.formatDate(this.today);
    this.bookingDate.set(this.formattedToday);
  }

  ngOnInit(): void {
    this.role.set(this.auth.role());
    this.initDashboard();

    // Subscribe to real-time WebSocket notifications
    this.wsService.onMessage().subscribe((event) => {
      if (event) {
        // Re-initialize dashboard when any appointment is booked/updated in real-time
        this.initDashboard();
        if (this.bookingDoctorId() && this.bookingDate()) {
          this.onBookingDoctorOrDateChange();
        }
      }
    });
  }

  initDashboard(): void {
    const userRole = this.role();
    if (userRole === 'PATIENT') {
      this.initPatientDashboard();
    } else if (userRole === 'DOCTOR') {
      this.initDoctorDashboard();
    } else if (userRole === 'ADMIN') {
      this.initAdminDashboard();
    }
  }

  greeting(): string {
    const h = this.today.getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // ==========================================
  // PATIENT DASHBOARD LOGIC
  // ==========================================
  initPatientDashboard(): void {
    const patientId = this.patientService.getMyPatientId();
    if (!patientId) {
      this.noProfileAlert.set(true);
      this.loadDoctorsList();
      return;
    }

    this.noProfileAlert.set(false);
    this.loading.set(true);

    this.patientService.get(patientId).subscribe({
      next: (profile) => {
        this.patientProfile.set(profile);
      },
      error: () => {
        this.noProfileAlert.set(true);
      }
    });

    this.appointmentService.forPatient(patientId).subscribe({
      next: (appts) => {
        this.patientAppointments.set(this.sortByDateDesc(appts));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });

    this.loadDoctorsList();
  }

  private loadDoctorsList(): void {
    this.doctorService.list().subscribe({
      next: (docs) => {
        this.doctorsList.set(docs);
      }
    });
  }

  // Computed: unique specialties from doctorsList
  get specialties(): string[] {
    const all = this.doctorsList().map(d => d.specialization).filter(Boolean);
    return [...new Set(all)].sort();
  }

  // Computed: filtered doctors based on specialty + search query
  get filteredDoctors(): Doctor[] {
    let docs = this.doctorsList();
    const spec = this.doctorFilterSpecialty();
    const query = this.doctorSearchQuery().toLowerCase().trim();
    if (spec) docs = docs.filter(d => d.specialization === spec);
    if (query) docs = docs.filter(d => d.fullName.toLowerCase().includes(query) || d.specialization.toLowerCase().includes(query));
    return docs;
  }

  selectSpecialty(spec: string): void {
    this.doctorFilterSpecialty.set(this.doctorFilterSpecialty() === spec ? '' : spec);
  }

  get upcomingPatientAppointments(): Appointment[] {
    return this.patientAppointments().filter(
      (a) => a.status === 'PENDING' || a.status === 'CONFIRMED'
    );
  }

  get pastPatientAppointments(): Appointment[] {
    return this.patientAppointments().filter(
      (a) => a.status === 'COMPLETED' || a.status === 'CANCELLED'
    );
  }

  analyzeSymptoms(): void {
    if (!this.symptomsText().trim()) {
      this.toast.show('Please enter your symptoms first.', 'error');
      return;
    }
    this.triageLoading.set(true);
    this.triageResult.set(null);
    this.aiTriageService.triage({ symptoms: this.symptomsText() }).subscribe({
      next: (res) => {
        this.triageResult.set(res);
        this.triageLoading.set(false);
        this.toast.show('Symptoms analyzed successfully!', 'success');
      },
      error: (err) => {
        this.triageLoading.set(false);
        this.toast.show(err.error?.message ?? 'AI Symptom Triage failed.', 'error');
      }
    });
  }

  bookTriageSlot(doctorId: number, date: string, time: string): void {
    const patientId = this.patientService.getMyPatientId();
    if (!patientId) {
      this.toast.show('Please complete your profile to book.', 'error');
      return;
    }

    const payload = {
      doctorId,
      patientId,
      appointmentTime: AppointmentService.toLocalDateTime(date, time),
      reason: `AI Triage: ${this.symptomsText().substring(0, 100)}...`
    };

    this.bookingSaving.set(true);
    this.appointmentService.book(payload).subscribe({
      next: () => {
        this.bookingSaving.set(false);
        this.toast.show('Appointment booked successfully!', 'success');
        this.symptomsText.set('');
        this.triageResult.set(null);
        this.initPatientDashboard();
      },
      error: (err) => {
        this.bookingSaving.set(false);
        this.toast.show(err.error?.message ?? 'Could not complete booking.', 'error');
      }
    });
  }

  onBookingDoctorOrDateChange(): void {
    const docId = this.bookingDoctorId();
    const date = this.bookingDate();
    this.bookingSlotTime.set('');

    if (docId && date) {
      this.bookingSlotsLoading.set(true);
      this.appointmentService.availableSlots(docId, date).subscribe({
        next: (slots) => {
          this.bookingSlots.set(slots);
          this.bookingSlotsLoading.set(false);
        },
        error: () => {
          this.bookingSlotsLoading.set(false);
          this.bookingSlots.set([]);
        }
      });
    } else {
      this.bookingSlots.set([]);
    }
  }

  quickBookDoctor(doctorId: number): void {
    this.bookingDoctorId.set(doctorId);
    // Scroll to booking section
    setTimeout(() => {
      document.getElementById('quick-booking-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  bookAppointment(): void {
    const patientId = this.patientService.getMyPatientId();
    if (!patientId) {
      this.toast.show('Please complete your profile to book.', 'error');
      return;
    }
    if (!this.bookingDoctorId() || !this.bookingDate() || !this.bookingSlotTime()) {
      this.toast.show('Please select a doctor, date, and available slot.', 'error');
      return;
    }

    const payload = {
      doctorId: this.bookingDoctorId()!,
      patientId,
      appointmentTime: AppointmentService.toLocalDateTime(this.bookingDate(), this.bookingSlotTime()),
      reason: this.bookingReason().trim() || undefined
    };

    this.bookingSaving.set(true);
    this.appointmentService.book(payload).subscribe({
      next: () => {
        this.bookingSaving.set(false);
        this.toast.show('Appointment booked successfully!', 'success');
        this.bookingDoctorId.set(null);
        this.bookingDate.set('');
        this.bookingSlots.set([]);
        this.bookingSlotTime.set('');
        this.bookingReason.set('');
        this.initPatientDashboard();
      },
      error: (err) => {
        this.bookingSaving.set(false);
        this.toast.show(err.error?.message ?? 'Could not book appointment.', 'error');
      }
    });
  }

  cancelAppointment(id: number): void {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      this.appointmentService.cancel(id).subscribe({
        next: () => {
          this.toast.show('Appointment cancelled.', 'success');
          this.initPatientDashboard();
        },
        error: () => {
          this.toast.show('Could not cancel appointment.', 'error');
        }
      });
    }
  }

  getSlotsArray(slotsObj: { [date: string]: AvailableSlot[] }): { date: string; slots: AvailableSlot[] }[] {
    if (!slotsObj) return [];
    return Object.keys(slotsObj).map((date) => ({
      date,
      slots: slotsObj[date],
    })).sort((a, b) => a.date.localeCompare(b.date));
  }

  // ==========================================
  // DOCTOR DASHBOARD LOGIC
  // ==========================================
  initDoctorDashboard(): void {
    const id = this.doctorService.getMyDoctorId();
    this.claimedDoctorId.set(id);

    this.doctorService.list().subscribe({
      next: (docs) => {
        this.doctorsList.set(docs);
      }
    });

    if (id) {
      this.loading.set(true);
      this.doctorService.get(id).subscribe({
        next: (details) => {
          this.claimedDoctorDetails.set(details);
        }
      });
      this.loadDoctorAppointments(id);
      this.loadPatientFolders(id);
    }
  }

  loadPatientFolders(doctorId: number): void {
    this.folderLoading.set(true);
    this.appointmentService.patientFolders(doctorId).subscribe({
      next: (folders) => {
        this.patientFolders.set(folders);
        this.folderLoading.set(false);
      },
      error: () => this.folderLoading.set(false)
    });
  }

  openPatientFolder(folder: PatientFolder): void {
    this.selectedFolder.set(folder);
    // Load appointments for this patient in this doctor's context
    this.appointmentService.forPatient(folder.patientId).subscribe({
      next: (appts) => {
        const doctorId = this.claimedDoctorId();
        // Filter appointments that belong to this doctor
        const filtered = appts.filter(a => a.doctorId === doctorId);
        this.folderPatientAppointments.set(this.sortByDateDesc(filtered));
      }
    });
  }

  closePatientFolder(): void {
    this.selectedFolder.set(null);
    this.folderPatientAppointments.set([]);
  }

  get filteredPatientFolders(): PatientFolder[] {
    const q = this.patientSearchQuery().toLowerCase().trim();
    if (!q) return this.patientFolders();
    return this.patientFolders().filter(f =>
      f.patientName.toLowerCase().includes(q) ||
      (f.patientEmail && f.patientEmail.toLowerCase().includes(q))
    );
  }

  claimDoctorIdentity(id: number): void {
    if (!id) return;
    this.doctorService.setMyDoctorId(id);
    this.claimedDoctorId.set(id);
    this.toast.show('Identity claimed successfully.', 'success');
    this.initDoctorDashboard();
  }

  clearClaimedDoctor(): void {
    localStorage.removeItem('chartwell_doctor_id');
    this.claimedDoctorId.set(null);
    this.claimedDoctorDetails.set(null);
    this.doctorAppointments.set([]);
    this.patientFolders.set([]);
    this.todayBookingsCount.set(0);
    this.pendingConfirmationsCount.set(0);
    this.completedVisitsCount.set(0);
    this.toast.show('Identity cleared.', 'success');
  }

  loadDoctorAppointments(id: number): void {
    this.appointmentService.forDoctor(id, 0, 100).subscribe({
      next: (res) => {
        const appts = res.content;
        this.doctorAppointments.set(appts);

        const todayAppts = appts.filter((a) => this.isOnToday(a.appointmentTime));

        this.todayBookingsCount.set(todayAppts.filter((a) => a.status !== 'CANCELLED').length);
        this.pendingConfirmationsCount.set(appts.filter((a) => a.status === 'PENDING').length);
        this.completedVisitsCount.set(appts.filter((a) => a.status === 'COMPLETED').length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  updateAppointmentStatus(id: number, status: AppointmentStatus): void {
    this.appointmentService.updateStatus(id, status).subscribe({
      next: () => {
        this.toast.show(`Appointment status updated to ${status.toLowerCase()}.`, 'success');
        if (this.role() === 'DOCTOR') {
          const docId = this.claimedDoctorId();
          if (docId) this.loadDoctorAppointments(docId);
        } else {
          this.initAdminDashboard();
        }
      },
      error: () => {
        this.toast.show('Failed to update status.', 'error');
      }
    });
  }

  get todayDoctorAppointments(): Appointment[] {
    return this.doctorAppointments().filter((a) => this.isOnToday(a.appointmentTime));
  }

  get otherDoctorAppointments(): Appointment[] {
    return this.doctorAppointments().filter((a) => !this.isOnToday(a.appointmentTime));
  }

  // Doctor avatar helper
  doctorAvatar(doctor: Doctor): string {
    return DoctorService.avatarFor(doctor);
  }

  doctorInitials(doctor: Doctor): string {
    return DoctorService.initials(doctor.fullName);
  }

  patientInitials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('');
  }

  statusColor(status: string): string {
    switch (status) {
      case 'PENDING': return 'status-pending';
      case 'CONFIRMED': return 'status-confirmed';
      case 'COMPLETED': return 'status-completed';
      case 'CANCELLED': return 'status-cancelled';
      default: return '';
    }
  }

  // ==========================================
  // ADMIN DASHBOARD LOGIC
  // ==========================================
  initAdminDashboard(): void {
    this.loading.set(true);

    this.doctorService.list().subscribe({
      next: (docs) => {
        this.adminDoctorsList.set(docs);
        this.doctorsCount.set(docs.length);

        this.patientService.list().subscribe({
          next: (patients) => {
            this.adminPatientsList.set(patients);
            this.patientsCount.set(patients.length);

            if (docs.length > 0) {
              const requests = docs.map((doc) =>
                this.appointmentService.forDoctor(doc.id, 0, 50).pipe(
                  catchError(() => of({ content: [] }))
                )
              );

              forkJoin(requests).subscribe({
                next: (results: any[]) => {
                  let allAppts: Appointment[] = [];
                  results.forEach((res) => {
                    if (res && res.content) {
                      allAppts = allAppts.concat(res.content);
                    }
                  });

                  this.adminAppointments.set(this.sortByDateDesc(allAppts));
                  this.totalAppointmentsCount.set(allAppts.length);
                  this.adminPendingCount.set(allAppts.filter((a) => a.status === 'PENDING').length);
                  this.loading.set(false);
                },
                error: () => this.loading.set(false)
              });
            } else {
              this.adminAppointments.set([]);
              this.totalAppointmentsCount.set(0);
              this.adminPendingCount.set(0);
              this.loading.set(false);
            }
          },
          error: () => {
            this.loading.set(false);
            this.toast.show('Failed to load patients.', 'error');
          }
        });
      },
      error: () => {
        this.loading.set(false);
        this.toast.show('Failed to load doctors.', 'error');
      }
    });
  }

  get pendingAdminAppointments(): Appointment[] {
    return this.adminAppointments().filter((a) => a.status === 'PENDING');
  }

  deleteDoctor(id: number): void {
    if (confirm('Are you sure you want to remove this doctor from the roster?')) {
      this.doctorService.delete(id).subscribe({
        next: () => {
          this.toast.show('Doctor removed from roster.', 'success');
          this.initAdminDashboard();
        },
        error: () => {
          this.toast.show('Failed to delete doctor.', 'error');
        }
      });
    }
  }

  toggleQuickAddDoctor(): void {
    this.quickAddDoctorOpen.set(!this.quickAddDoctorOpen());
  }

  quickAddDoctor(): void {
    if (!this.newDocName.trim() || !this.newDocSpecialization.trim() || !this.newDocEmail.trim()) {
      this.toast.show('Doctor name, specialization, and email are required.', 'error');
      return;
    }

    const payload = {
      fullName: this.newDocName.trim(),
      specialization: this.newDocSpecialization.trim(),
      email: this.newDocEmail.trim() || undefined,
      phone: this.newDocPhone.trim() || undefined,
      startTime: this.newDocShiftStart || '09:00',
      endTime: this.newDocShiftEnd || '17:00'
    };

    this.quickDocSaving.set(true);
    this.doctorService.create(payload).subscribe({
      next: () => {
        this.quickDocSaving.set(false);
        this.toast.show('Doctor added successfully!', 'success');
        this.quickAddDoctorOpen.set(false);
        this.newDocName = '';
        this.newDocSpecialization = '';
        this.newDocEmail = '';
        this.newDocPhone = '';
        this.newDocShiftStart = '09:00';
        this.newDocShiftEnd = '17:00';
        this.initAdminDashboard();
      },
      error: (err) => {
        this.quickDocSaving.set(false);
        this.toast.show(err.error?.message ?? 'Could not create doctor.', 'error');
      }
    });
  }

  // Common helpers
  appointmentDate(appointment: Appointment): string {
    return AppointmentService.extractDate(appointment.appointmentTime);
  }

  appointmentTime(appointment: Appointment): string {
    return AppointmentService.extractTime(appointment.appointmentTime);
  }

  private isOnToday(appointmentTime: string): boolean {
    return AppointmentService.extractDate(appointmentTime) === this.formattedToday;
  }

  private sortByDateDesc(list: Appointment[]): Appointment[] {
    return [...list].sort((a, b) => (a.appointmentTime < b.appointmentTime ? 1 : -1));
  }
}
