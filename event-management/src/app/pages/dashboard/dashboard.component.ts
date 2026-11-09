import { Component, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';

type UiEvent = {
  id: number;
  name: string;
  dateTime: string;
  registrations: number;
  capacity: number;
  checkins: number;
  status: string;
};

type UiRecentReg = {
  name: string;
  event: string;
  status: string;
  createdAt: string;
};

type UiTrend = {
  day: string;
  registrations: number;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgClass, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  kpiStats = {
    upcomingEvents: 0,
    registrationsToday: 0,
    totalRegistrations: 0,
    checkInsOngoing: 0
  };

  upcomingEvents: UiEvent[] = [];
  recentRegistrations: UiRecentReg[] = [];
  registrationTrends: UiTrend[] = [];

  maxRegistrations = 1;
  isLoading = false;
  errorMessage = '';
  selectedEvent: any = null;
  pendingDeleteEventId: number | null = null;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.dashboardService.getSummary().subscribe({
      next: (res) => {
        this.isLoading = false;

        console.log('Dashboard API response:', res);

        this.kpiStats = res?.kpi || this.kpiStats;

        this.upcomingEvents = (res?.upcomingEvents || []).map((e: any) => ({
          id: e.id,
          name: e.event_name,
          dateTime: e.start_at,
          registrations: Number(e.registrations || 0),
          capacity: Number(e.registration_limit || 0),
          checkins: Number(e.checkins || 0),
          status: e.status || 'Upcoming'
        }));

        this.recentRegistrations = (res?.recentRegistrations || []).map((r: any) => ({
          name: r.attendee_name,
          event: r.event_name,
          status: r.status || 'Confirmed',
          createdAt: r.registered_at
        }));

        this.registrationTrends = (res?.registrationTrends || []).map((t: any) => ({
          day: String(t.day || '').trim(),
          registrations: Number(t.registrations || 0)
        }));

        console.log('Registration Trends:', this.registrationTrends);

        const highest = Math.max(...this.registrationTrends.map(t => t.registrations), 0);
        this.maxRegistrations = highest > 0 ? highest : 1;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Failed to load dashboard.';
      }
    });
  }

  copyRegisterLink(eventId: number): void {
    const link = `${window.location.origin}/register/${eventId}`;
    navigator.clipboard.writeText(link).then(() => {
      this.showToast('Registration link copied to clipboard ✅');
    }).catch(() => {
      this.showToast('Failed to copy link ❌', true);
    });
  }

  viewDetails(eventId: number): void {
    this.dashboardService.getEventById(eventId).subscribe({
      next: (event) => {
        this.selectedEvent = event;

        const modal = new (window as any).bootstrap.Modal(
          document.getElementById('eventDetailsModal')
        );
        modal.show();
      },
      error: (err) => {
        this.showToast(err?.error?.message || 'Failed to load event details ❌', true);
      }
    });
  }

  duplicateEvent(eventId: number): void {
    this.dashboardService.duplicateEvent(eventId).subscribe({
      next: (res) => {
        this.showToast(res?.message || 'Event duplicated successfully ✅');
        this.loadDashboard();
      },
      error: (err) => {
        this.showToast(err?.error?.message || 'Failed to duplicate event ❌', true);
      }
    });
  }

  deleteEvent(eventId: number): void {
    this.pendingDeleteEventId = eventId;

    const modal = new (window as any).bootstrap.Modal(
      document.getElementById('deleteConfirmModal')
    );
    modal.show();
  }

  confirmDelete(): void {
    if (!this.pendingDeleteEventId) return;

    this.dashboardService.deleteEvent(this.pendingDeleteEventId).subscribe({
      next: (res) => {
        this.showToast(res?.message || 'Event deleted successfully ✅');
        this.loadDashboard();
        this.pendingDeleteEventId = null;

        const modalEl = document.getElementById('deleteConfirmModal');
        const modalInstance = (window as any).bootstrap.Modal.getInstance(modalEl);
        modalInstance?.hide();
      },
      error: (err) => {
        this.showToast(err?.error?.message || 'Failed to delete event ❌', true);
      }
    });
  }

  showToast(message: string, isError: boolean = false): void {
    const toastBody = document.getElementById('actionToastMessage');
    if (toastBody) {
      toastBody.innerText = message;
    }

    const toastEl = document.getElementById('actionToast');
    if (!toastEl) return;

    toastEl.classList.remove('text-bg-success', 'text-bg-danger');
    toastEl.classList.add(isError ? 'text-bg-danger' : 'text-bg-success');

    const toast = new (window as any).bootstrap.Toast(toastEl);
    toast.show();
  }
}