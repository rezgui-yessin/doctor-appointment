import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Appointment } from '../../../core/models/appointment.model';
import { RouterLink } from '@angular/router';
import { SpinnerComponent } from '../spinner/spinner.component';

interface CalendarDay {
  date: Date;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointments: Appointment[];
}

@Component({
  selector: 'app-appointment-calendar',
  standalone: true,
  imports: [CommonModule, RouterLink, SpinnerComponent],
  template: `
    <div class="cal-wrapper">
      <!-- Calendar Header -->
      <div class="cal-nav">
        <button class="cal-nav-btn" (click)="prevMonth()">&#8249;</button>
        <h3 class="cal-month-title">{{ monthLabel() }}</h3>
        <button class="cal-nav-btn" (click)="nextMonth()">&#8250;</button>
        <button class="cal-today-btn" (click)="goToToday()">Today</button>
      </div>

      <app-spinner *ngIf="loading()" label="Loading schedule…"></app-spinner>

      <ng-container *ngIf="!loading()">
        <!-- Day Labels -->
        <div class="cal-weekdays">
          <span *ngFor="let d of weekDays">{{ d }}</span>
        </div>

        <!-- Calendar Grid -->
        <div class="cal-grid">
          <div
            class="cal-cell"
            *ngFor="let day of calendarDays()"
            [class.other-month]="!day.isCurrentMonth"
            [class.today]="day.isToday"
            [class.has-appts]="day.appointments.length > 0"
          >
            <span class="cell-day-num">{{ day.dayNum }}</span>
            <div class="cell-appts">
              <div
                class="cal-appt-pill"
                *ngFor="let appt of day.appointments.slice(0, 2)"
                [ngClass]="'pill-' + appt.status.toLowerCase()"
                [title]="'Dr. ' + appt.doctorName + ' – ' + appt.status"
              >
                {{ formatTime(appt.appointmentTime) }} · Dr. {{ (appt.doctorName || 'Doctor').split(' ')[0] }}
              </div>
              <span class="more-badge" *ngIf="day.appointments.length > 2">
                +{{ day.appointments.length - 2 }} more
              </span>
            </div>
          </div>
        </div>

        <!-- Legend -->
        <div class="cal-legend">
          <span class="legend-item"><span class="dot dot-pending"></span> Pending</span>
          <span class="legend-item"><span class="dot dot-confirmed"></span> Confirmed</span>
          <span class="legend-item"><span class="dot dot-completed"></span> Completed</span>
          <span class="legend-item"><span class="dot dot-cancelled"></span> Cancelled</span>
        </div>

        <!-- Upcoming Appointments List below Calendar -->
        <div class="upcoming-list" *ngIf="upcomingAppointments().length > 0">
          <h4 class="upcoming-title">Upcoming Visits</h4>
          <div class="upcoming-item" *ngFor="let appt of upcomingAppointments()">
            <div class="upcoming-date-badge">
              <span class="udate-month">{{ appt.appointmentTime | date:'MMM' }}</span>
              <span class="udate-day">{{ appt.appointmentTime | date:'d' }}</span>
            </div>
            <div class="upcoming-info">
              <p class="upcoming-doctor">Dr. {{ appt.doctorName }}</p>
              <p class="upcoming-time">{{ appt.appointmentTime | date:'h:mm a' }}</p>
              <p class="upcoming-reason" *ngIf="appt.reason">"{{ appt.reason }}"</p>
            </div>
            <span class="upcoming-status tag" [ngClass]="'tag-' + appt.status.toLowerCase()">{{ appt.status }}</span>
          </div>
        </div>

        <div class="empty-state" *ngIf="appointments().length === 0">
          <span class="glyph">📅</span>
          <p>No appointments found. <a routerLink="/book">Book a visit</a></p>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .cal-wrapper {
      background: var(--c-surface, #1a1a2e);
      border-radius: 12px;
      padding: 1.5rem;
    }

    .cal-nav {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }

    .cal-month-title {
      flex: 1;
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--c-text-primary, #f0f0f0);
      text-align: center;
      margin: 0;
    }

    .cal-nav-btn {
      background: var(--c-bg-alt, #252540);
      border: 1px solid var(--c-border, #333);
      color: var(--c-text-primary, #f0f0f0);
      border-radius: 8px;
      width: 34px;
      height: 34px;
      font-size: 1.25rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }
    .cal-nav-btn:hover { background: var(--c-accent, #7c5cfc); }

    .cal-today-btn {
      background: transparent;
      border: 1px solid var(--c-accent, #7c5cfc);
      color: var(--c-accent, #7c5cfc);
      border-radius: 20px;
      padding: 0.25rem 0.75rem;
      font-size: 0.78rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .cal-today-btn:hover { background: var(--c-accent, #7c5cfc); color: #fff; }

    .cal-weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
      margin-bottom: 4px;
    }
    .cal-weekdays span {
      text-align: center;
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--c-text-muted, #888);
      letter-spacing: 0.05em;
      padding: 4px 0;
    }

    .cal-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
    }

    .cal-cell {
      min-height: 72px;
      background: var(--c-bg-alt, #1e1e3a);
      border-radius: 8px;
      padding: 6px;
      cursor: default;
      border: 1px solid transparent;
      transition: border-color 0.2s;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .cal-cell.other-month { opacity: 0.3; }
    .cal-cell.today {
      border-color: var(--c-accent, #7c5cfc);
      background: rgba(124, 92, 252, 0.12);
    }
    .cal-cell.has-appts { border-color: rgba(124, 92, 252, 0.3); }

    .cell-day-num {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--c-text-muted, #888);
      line-height: 1;
    }
    .today .cell-day-num {
      color: var(--c-accent, #7c5cfc);
    }

    .cell-appts {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .cal-appt-pill {
      font-size: 0.62rem;
      padding: 2px 5px;
      border-radius: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 600;
    }
    .pill-pending    { background: rgba(245, 166, 35, 0.25); color: #f5a623; }
    .pill-confirmed  { background: rgba(80, 200, 120, 0.2); color: #50c878; }
    .pill-completed  { background: rgba(100, 149, 237, 0.2); color: #6495ed; }
    .pill-cancelled  { background: rgba(200, 80, 80, 0.2); color: #c85050; text-decoration: line-through; }

    .more-badge {
      font-size: 0.6rem;
      color: var(--c-text-muted, #888);
      padding-left: 2px;
    }

    .cal-legend {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 0.75rem;
      flex-wrap: wrap;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.72rem;
      color: var(--c-text-muted, #888);
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .dot-pending { background: #f5a623; }
    .dot-confirmed { background: #50c878; }
    .dot-completed { background: #6495ed; }
    .dot-cancelled { background: #c85050; }

    .upcoming-list {
      margin-top: 1.25rem;
      border-top: 1px solid var(--c-border, #333);
      padding-top: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .upcoming-title {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--c-text-muted, #aaa);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 0.5rem;
    }
    .upcoming-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.6rem 0.75rem;
      background: var(--c-bg-alt, #1e1e3a);
      border-radius: 8px;
    }
    .upcoming-date-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: var(--c-accent, #7c5cfc);
      border-radius: 6px;
      padding: 4px 8px;
      min-width: 40px;
    }
    .udate-month {
      font-size: 0.6rem;
      color: rgba(255,255,255,0.8);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .udate-day {
      font-size: 1.1rem;
      font-weight: 800;
      color: #fff;
      line-height: 1;
    }
    .upcoming-info { flex: 1; }
    .upcoming-doctor { margin: 0; font-weight: 700; font-size: 0.85rem; color: var(--c-text-primary, #f0f0f0); }
    .upcoming-time { margin: 0; font-size: 0.75rem; color: var(--c-text-muted, #aaa); }
    .upcoming-reason { margin: 2px 0 0; font-size: 0.72rem; color: var(--c-text-muted, #888); font-style: italic; }

    .upcoming-status {
      font-size: 0.65rem;
      padding: 2px 7px;
    }

    .empty-state {
      text-align: center;
      padding: 2rem;
      color: var(--c-text-muted, #888);
    }
    .glyph { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
    .empty-state a { color: var(--c-accent, #7c5cfc); }
  `]
})
export class AppointmentCalendarComponent implements OnInit {
  private appointmentService = inject(AppointmentService);

  loading = signal(false);
  appointments = signal<Appointment[]>([]);

  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  today = new Date();
  currentYear = signal(this.today.getFullYear());
  currentMonth = signal(this.today.getMonth()); // 0-indexed

  monthLabel = computed(() => {
    const d = new Date(this.currentYear(), this.currentMonth(), 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  upcomingAppointments = computed(() => {
    const now = new Date();
    return this.appointments()
      .filter(a => new Date(a.appointmentTime) >= now && a.status !== 'CANCELLED')
      .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime))
      .slice(0, 5);
  });

  calendarDays = computed<CalendarDay[]>(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDaysCount = firstDay;
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

    const todayStr = this.today.toDateString();
    const apptMap = new Map<string, Appointment[]>();

    for (const appt of this.appointments()) {
      const d = new Date(appt.appointmentTime);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!apptMap.has(key)) apptMap.set(key, []);
      apptMap.get(key)!.push(appt);
    }

    const days: CalendarDay[] = [];
    for (let i = 0; i < totalCells; i++) {
      let date: Date;
      let isCurrentMonth = false;
      if (i < prevDaysCount) {
        date = new Date(year, month - 1, daysInPrevMonth - prevDaysCount + i + 1);
      } else if (i < prevDaysCount + daysInMonth) {
        date = new Date(year, month, i - prevDaysCount + 1);
        isCurrentMonth = true;
      } else {
        date = new Date(year, month + 1, i - prevDaysCount - daysInMonth + 1);
      }
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      days.push({
        date,
        dayNum: date.getDate(),
        isCurrentMonth,
        isToday: date.toDateString() === todayStr,
        appointments: apptMap.get(key) ?? []
      });
    }
    return days;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.appointmentService.forMe().subscribe({
      next: (list) => {
        this.appointments.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  prevMonth(): void {
    if (this.currentMonth() === 0) {
      this.currentMonth.set(11);
      this.currentYear.update(y => y - 1);
    } else {
      this.currentMonth.update(m => m - 1);
    }
  }

  nextMonth(): void {
    if (this.currentMonth() === 11) {
      this.currentMonth.set(0);
      this.currentYear.update(y => y + 1);
    } else {
      this.currentMonth.update(m => m + 1);
    }
  }

  goToToday(): void {
    this.currentYear.set(this.today.getFullYear());
    this.currentMonth.set(this.today.getMonth());
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
}
