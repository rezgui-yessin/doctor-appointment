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

  /** Stock portrait photos (Unsplash License, free to use) used as
   * placeholder avatars since the API doesn't store a doctor photo. */
  private readonly avatarPhotos = [
    'https://images.unsplash.com/photo-1758691462651-611d730c5272?w=200&h=200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1758691463333-c79215e8bc3b?w=200&h=200&q=80&auto=format&fit=crop',
  ];

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
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('');
  }

  avatarFor(doctor: Doctor): string {
    return this.avatarPhotos[doctor.id % this.avatarPhotos.length];
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
