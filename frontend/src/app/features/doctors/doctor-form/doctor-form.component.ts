import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DoctorService } from '../../../core/services/doctor.service';
import { UploadService } from '../../../core/services/upload.service';
import { AuthService } from '../../../core/services/auth.service';
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
  uploading = signal(false);
  doctorId: number | null = null;
  photoPreview = signal<string | null>(null);
  form: any;

  constructor(
    private fb: FormBuilder,
    private doctorService: DoctorService,
    private uploadService: UploadService,
    public auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService
  ) {
    this.form = this.fb.nonNullable.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      specialization: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      workingDays: ['MON,TUE,WED,THU,FRI'],
      startTime: ['09:00', [Validators.required]],
      endTime: ['17:00', [Validators.required]],
      photoUrl: [''],
    });
  }

  get isEdit(): boolean {
    return this.doctorId !== null;
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.doctorId = Number(idParam);
      this.loadDoctor(this.doctorId);
    } else if (this.auth.role() === 'DOCTOR') {
      const storedId = this.doctorService.getMyDoctorId();
      if (storedId) {
        this.doctorId = storedId;
        this.loadDoctor(this.doctorId);
      } else {
        this.loading.set(true);
        this.doctorService.getMyProfile().subscribe({
          next: (doc) => {
            this.doctorId = doc.id;
            this.form.patchValue(doc);
            if (doc.photoUrl) this.photoPreview.set(doc.photoUrl);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      }
    }
  }

  private loadDoctor(id: number): void {
    this.loading.set(true);
    this.doctorService.get(id).subscribe({
      next: (doc) => {
        this.form.patchValue(doc);
        if (doc.photoUrl) this.photoPreview.set(doc.photoUrl);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];

    const reader = new FileReader();
    reader.onload = (e) => this.photoPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);

    const entityId = this.doctorId
      ? String(this.doctorId)
      : (this.form.get('email')?.value || 'doctor');

    this.uploading.set(true);
    this.uploadService.uploadPhoto(file, entityId).subscribe({
      next: (res) => {
        this.form.patchValue({ photoUrl: res.url });
        this.photoPreview.set(res.url);
        this.uploading.set(false);
        this.toast.show('Photo uploaded to Cloudinary!', 'success');
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
    const req$ = this.isEdit
      ? this.doctorService.update(this.doctorId!, payload)
      : this.doctorService.create(payload);

    req$.subscribe({
      next: (doc) => {
        this.saving.set(false);
        if (doc?.id) {
          this.doctorId = doc.id;
          this.doctorService.setMyDoctorId(doc.id);
        }
        this.toast.show(this.isEdit ? 'Profile updated! You are visible in doctor roster.' : 'Doctor added to roster.', 'success');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.show(err.error?.message ?? 'Could not save doctor profile.', 'error');
      },
    });
  }

  get initials(): string {
    const name = this.form.get('fullName')?.value || '';
    return name.split(' ').filter(Boolean).slice(0, 2).map((p: string) => p[0]?.toUpperCase()).join('');
  }
}
