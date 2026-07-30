import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PatientService } from '../../../core/services/patient.service';
import { UploadService } from '../../../core/services/upload.service';
import { ToastService } from '../../../core/services/toast.service';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';

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
  uploading = signal(false);
  patientId: number | null = null;
  photoPreview = signal<string | null>(null);
  form: any;

  constructor(
    private fb: FormBuilder,
    private patientService: PatientService,
    private uploadService: UploadService,
    private toast: ToastService
  ) {
    this.form = this.fb.nonNullable.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.email]],
      phone: [''],
      dateOfBirth: [''],
      photoUrl: [''],
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
          if (p.photoUrl) {
            this.photoPreview.set(p.photoUrl);
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => this.photoPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to backend
    this.uploading.set(true);
    this.uploadService.uploadPhoto(file).subscribe({
      next: (res) => {
        this.form.patchValue({ photoUrl: res.url });
        this.photoPreview.set(res.url);
        this.uploading.set(false);
        this.toast.show('Photo uploaded successfully!', 'success');
      },
      error: (err) => {
        this.uploading.set(false);
        this.toast.show(err.error?.error ?? 'Photo upload failed.', 'error');
      },
    });
  }

  removePhoto(): void {
    this.photoPreview.set(null);
    this.form.patchValue({ photoUrl: '' });
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
        this.toast.show('Profile saved successfully!', 'success');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.show(err.error?.message ?? 'Could not save your profile.', 'error');
      },
    });
  }

  get initials(): string {
    const name = this.form.get('fullName')?.value || '';
    return name.split(' ').filter(Boolean).slice(0, 2).map((p: string) => p[0]?.toUpperCase()).join('');
  }
}
