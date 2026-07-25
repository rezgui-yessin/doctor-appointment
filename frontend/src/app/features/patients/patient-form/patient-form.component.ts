import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PatientService } from '../../../core/services/patient.service';
import { ToastService } from '../../../core/services/toast.service';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';

/**
 * The API models a Patient as its own resource (id, fullName, email, phone,
 * dateOfBirth) separate from the login account. Since the README doesn't
 * expose an endpoint that resolves "my patient record" from the JWT, this
 * page keeps a local pointer (myPatientId) to whichever patient record this
 * browser created, and offers to create one the first time a patient signs in.
 */
@Component({
  selector: 'app-patient-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SpinnerComponent],
  templateUrl: './patient-form.component.html',
  styleUrl: './patient-form.component.scss',
})
export class PatientFormComponent implements OnInit {
  loading = signal(false);
  saving = signal(false);
  patientId: number | null = null;
  form: any;

  constructor(private fb: FormBuilder, private patientService: PatientService, private toast: ToastService) {
    this.form = this.fb.nonNullable.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.email]],
      phone: [''],
      dateOfBirth: [''],
    });
  }

  ngOnInit(): void {
    const stored = this.patientService.getMyPatientId();
    if (stored) {
      this.patientId = stored;
      this.loading.set(true);
      this.patientService.get(this.patientId).subscribe({
        next: (p) => {
          this.form.patchValue(p);
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
    const req$ = this.patientId
      ? this.patientService.update(this.patientId, payload)
      : this.patientService.create(payload);

    req$.subscribe({
      next: (patient) => {
        this.saving.set(false);
        this.patientId = patient.id;
        this.patientService.setMyPatientId(patient.id);
        this.toast.show('Profile saved.', 'success');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.show(err.error?.message ?? 'Could not save your profile.', 'error');
      },
    });
  }
}
