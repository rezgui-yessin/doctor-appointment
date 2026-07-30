import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DoctorService } from '../../../core/services/doctor.service';
import { Doctor } from '../../../core/models/doctor.model';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-doctor-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SpinnerComponent, ConfirmDialogComponent],
  templateUrl: './doctor-list.component.html',
  styleUrl: './doctor-list.component.scss',
})
export class DoctorListComponent implements OnInit {
  doctors = signal<Doctor[]>([]);
  loading = signal(false);
  query = '';
  pendingDelete = signal<Doctor | null>(null);

  constructor(private doctorService: DoctorService, public auth: AuthService, private toast: ToastService) {}

  ngOnInit(): void {
    this.fetch();
  }

  fetch(): void {
    this.loading.set(true);
    this.doctorService.list(this.query || undefined).subscribe({
      next: (docs) => {
        this.doctors.set(docs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  initials(name: string): string {
    return DoctorService.initials(name);
  }

  avatarFor(doctor: Doctor): string {
    return DoctorService.avatarFor(doctor);
  }

  confirmDelete(): void {
    const doc = this.pendingDelete();
    if (!doc) return;
    this.doctorService.delete(doc.id).subscribe({
      next: () => {
        this.doctors.update((list) => list.filter((d) => d.id !== doc.id));
        this.toast.show(`Removed ${doc.fullName} from the roster.`, 'success');
        this.pendingDelete.set(null);
      },
      error: () => {
        this.toast.show('Could not remove this doctor.', 'error');
        this.pendingDelete.set(null);
      },
    });
  }
}
