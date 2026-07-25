import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Role } from '../../../core/models/auth.model';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SpinnerComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  loading = signal(false);
  roles: { value: Role; label: string; hint: string }[] = [
    { value: 'PATIENT', label: 'Patient', hint: 'Book and manage your own visits' },
    { value: 'DOCTOR', label: 'Doctor', hint: 'Manage your schedule and patients' },
    { value: 'ADMIN', label: 'Admin', hint: 'Run the clinic roster' },
  ];
  form: any;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private toast: ToastService,
    private router: Router
  ) {
    this.form = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['PATIENT' as Role, [Validators.required]],
    });
  }

  selectRole(role: Role): void {
    this.form.controls.role.setValue(role);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.show('Account created. Sign in to continue.', 'success');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.show(err.error?.message ?? 'Could not create that account.', 'error');
      },
    });
  }
}
