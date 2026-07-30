import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DoctorService } from '../../../core/services/doctor.service';
import { PatientService } from '../../../core/services/patient.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Doctor } from '../../../core/models/doctor.model';
import { AvailableSlot } from '../../../core/models/appointment.model';
import { ToastService } from '../../../core/services/toast.service';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';

function todayIso(): string {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SpinnerComponent],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.scss',
})
export class BookingComponent implements OnInit {
  doctors = signal<Doctor[]>([]);
  slots = signal<AvailableSlot[]>([]);
  loadingDoctors = signal(false);
  loadingSlots = signal(false);
  booking = signal(false);

  selectedDoctorId: number | null = null;
  selectedDate = todayIso();
  minDate = todayIso();
  selectedSlot = signal<AvailableSlot | null>(null);
  reason = '';

  patientId: number | null = null;

  selectedDoctor = computed(() => this.doctors().find((d) => d.id === this.selectedDoctorId) ?? null);
  availableCount = computed(() => this.slots().length);

  constructor(
    private doctorService: DoctorService,
    private patientService: PatientService,
    private appointmentService: AppointmentService,
    private toast: ToastService,
    private router: Router
  ) {
    this.patientId = this.patientService.getMyPatientId();
  }

  ngOnInit(): void {
    this.loadingDoctors.set(true);
    this.doctorService.list().subscribe({
      next: (docs) => {
        this.doctors.set(docs);
        this.loadingDoctors.set(false);
        if (docs.length === 1) {
          this.selectedDoctorId = docs[0].id;
          this.fetchSlots();
        }
      },
      error: () => this.loadingDoctors.set(false),
    });
  }

  onDoctorChange(): void {
    this.selectedSlot.set(null);
    this.fetchSlots();
  }

  onDateChange(): void {
    this.selectedSlot.set(null);
    this.fetchSlots();
  }

  fetchSlots(): void {
    if (!this.selectedDoctorId || !this.selectedDate) return;
    this.loadingSlots.set(true);
    this.slots.set([]);
    // Backend returns AvailableSlotDTO(time) - list of available slots only
    this.appointmentService.availableSlots(this.selectedDoctorId, this.selectedDate).subscribe({
      next: (slots) => {
        this.slots.set(slots);
        this.loadingSlots.set(false);
      },
      error: () => {
        this.loadingSlots.set(false);
        this.toast.show("Could not load this doctor's day sheet.", 'error');
      },
    });
  }

  pick(slot: AvailableSlot): void {
    this.selectedSlot.set(slot);
  }

  avatarFor(doctor: Doctor): string {
    return DoctorService.avatarFor(doctor);
  }

  confirmBooking(): void {
    const slot = this.selectedSlot();
    if (!slot || !this.selectedDoctorId) return;
    if (!this.patientId) {
      this.toast.show('Finish your profile first so we know who to book for.', 'info');
      this.router.navigate(['/my-profile']);
      return;
    }
    this.booking.set(true);
    const appointmentTime = AppointmentService.toLocalDateTime(this.selectedDate, slot.time);
    this.appointmentService
      .book({
        doctorId: this.selectedDoctorId,
        patientId: this.patientId,
        appointmentTime,
        reason: this.reason || undefined,
      })
      .subscribe({
        next: () => {
          this.booking.set(false);
          this.toast.show(`Booked for ${slot.time} on ${this.selectedDate}.`, 'success');
          this.router.navigate(['/appointments']);
        },
        error: () => {
          this.booking.set(false);
          this.fetchSlots();
          this.selectedSlot.set(null);
        },
      });
  }
}
