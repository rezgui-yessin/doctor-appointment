import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DoctorService } from '../../../core/services/doctor.service';
import { ToastService } from '../../../core/services/toast.service';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';

@Component({
  selector: 'app-doctor-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SpinnerComponent],
  templateUrl: './doctor-form.component.html',
  styleUrl: './doctor-form.component.scss',
})
export class DoctorFormComponent implements OnInit {
  loading = signal(false);
  saving = signal(false);
  doctorId: number | null = null;
  form: any;

  constructor(
    private fb: FormBuilder,
    private doctorService: DoctorService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService
  ) {
    this.form = this.fb.nonNullable.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      specialization: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      startTime: ['09:00', [Validators.required]],
      endTime: ['17:00', [Validators.required]],
    });
  }

  get isEdit(): boolean {
    return this.doctorId !== null;
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.doctorId = Number(idParam);
      this.loading.set(true);
      this.doctorService.get(this.doctorId).subscribe({
        next: (doc) => {
          this.form.patchValue(doc);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const payload = this.form.getRawValue();
    const req$ = this.isEdit
      ? this.doctorService.update(this.doctorId!, payload)
      : this.doctorService.create(payload);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.show(this.isEdit ? 'Doctor profile updated.' : 'Doctor added to the roster.', 'success');
        this.router.navigate(['/doctors']);
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.show(err.error?.message ?? 'Could not save this doctor.', 'error');
      },
    });
  }
}
