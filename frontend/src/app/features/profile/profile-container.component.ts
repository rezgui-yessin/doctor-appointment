import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { PatientFormComponent } from '../patients/patient-form/patient-form.component';
import { DoctorFormComponent } from '../doctors/doctor-form/doctor-form.component';

@Component({
  selector: 'app-profile-container',
  standalone: true,
  imports: [CommonModule, PatientFormComponent, DoctorFormComponent],
  template: `
    <ng-container [ngSwitch]="auth.role()">
      <app-patient-form *ngSwitchCase="'PATIENT'"></app-patient-form>
      <app-doctor-form *ngSwitchCase="'DOCTOR'"></app-doctor-form>
      <div *ngSwitchDefault class="page-shell narrow">
        <p>Please log in to view your profile.</p>
      </div>
    </ng-container>
  `,
})
export class ProfileContainerComponent {
  constructor(public auth: AuthService) {}
}
