import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventsService } from '../../services/events.service';

type UiEventStatus = 'Upcoming' | 'Ongoing' | 'Completed';

type UiEvent = {
  id: number;
  name: string;
  registrations: number;
  checkins: number;
  capacity: number;
  date: Date;
  endDate: Date;
  location: string;
  status: UiEventStatus;
};

@Component({
  selector: 'app-manage-events',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './manage-events.component.html',
  styleUrls: ['./manage-events.component.css']
})
export class ManageEventsComponent implements OnInit {

  currentView: 'list' | 'calendar' = 'list';

  searchTerm = '';
  sortOption: 'date' | 'name' = 'date';

  upcomingEvents: UiEvent[] = [];
  ongoingEvents: UiEvent[] = [];
  pastEvents: UiEvent[] = [];

  filteredUpcomingEvents: UiEvent[] = [];
  filteredOngoingEvents: UiEvent[] = [];
  filteredPastEvents: UiEvent[] = [];

  isLoading = false;
  errorMessage = '';

  pendingDeleteEventId: number | null = null;

  constructor(private eventsService: EventsService) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  setView(view: 'list' | 'calendar'): void {
    this.currentView = view;
  }

 copyRegisterLink(eventId: number) {

  const url = `${window.location.origin}/register/${eventId}`;

  navigator.clipboard.writeText(url);

  const toastEl = document.getElementById('copyToast');
  const toast = new (window as any).bootstrap.Toast(toastEl);

  toast.show();
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

  duplicateEvent(eventId: number): void {
    this.eventsService.duplicateEvent(eventId).subscribe({
      next: (res) => {
        this.showToast(res?.message || 'Event duplicated successfully ✅');
        this.loadEvents();
      },
      error: (err) => {
        this.showToast(err?.error?.message || 'Failed to duplicate event ❌', true);
      }
    });
  }

  deleteEvent(eventId: number): void {
    this.pendingDeleteEventId = eventId;

    const modalEl = document.getElementById('deleteConfirmModal');
    if (!modalEl) return;

    const modal = new (window as any).bootstrap.Modal(modalEl);
    modal.show();
  }

  confirmDelete(): void {
    if (!this.pendingDeleteEventId) return;

    this.eventsService.deleteEvent(this.pendingDeleteEventId).subscribe({
      next: (res) => {
        this.showToast(res?.message || 'Event deleted successfully ✅');
        this.loadEvents();
        this.pendingDeleteEventId = null;

        const modalEl = document.getElementById('deleteConfirmModal');
        if (modalEl) {
          const modalInstance = (window as any).bootstrap.Modal.getInstance(modalEl);
          modalInstance?.hide();
        }
      },
      error: (err) => {
        this.showToast(err?.error?.message || 'Failed to delete event ❌', true);
      }
    });
  }

  private computeStatus(start: Date, end: Date, dbStatus: string): UiEventStatus {
    const now = new Date();

    if (start <= now && end >= now) return 'Ongoing';
    if (end < now) return 'Completed';

    if ((dbStatus || '').toLowerCase() === 'published') return 'Upcoming';

    return 'Upcoming';
  }

  loadEvents(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.eventsService.getEvents().subscribe({
      next: (rows: any[]) => {
        this.isLoading = false;

        const all: UiEvent[] = (rows || []).map(r => {
          const start = new Date(r.start_at);
          const end = new Date(r.end_at);
          const status = this.computeStatus(start, end, r.status);

          return {
            id: r.id,
            name: r.event_name,
            registrations: Number(r.registration_count || 0),
            checkins: Number(r.checkin_count || 0),
            capacity: Number(r.registration_limit || 0),
            date: start,
            endDate: end,
            location: r.venue_name || r.venue_address || '—',
            status
          };
        });

        this.ongoingEvents = all.filter(e => e.status === 'Ongoing');
        this.upcomingEvents = all.filter(e => e.status === 'Upcoming');
        this.pastEvents = all.filter(e => e.status === 'Completed');

        this.filterEvents();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Failed to load events.';
      }
    });
  }

  filterEvents(): void {
    const term = this.searchTerm.toLowerCase().trim();

    const filterFn = (e: UiEvent) =>
      e.name.toLowerCase().includes(term) ||
      e.location.toLowerCase().includes(term);

    this.filteredUpcomingEvents = this.upcomingEvents.filter(filterFn);
    this.filteredOngoingEvents = this.ongoingEvents.filter(filterFn);
    this.filteredPastEvents = this.pastEvents.filter(filterFn);

    this.sortEvents();
  }

  sortEvents(): void {
    const sortFn = (a: UiEvent, b: UiEvent) => {
      if (this.sortOption === 'name') {
        return a.name.localeCompare(b.name);
      }

      if (a.status === 'Completed' && b.status === 'Completed') {
        return b.date.getTime() - a.date.getTime();
      }

      return a.date.getTime() - b.date.getTime();
    };

    this.filteredUpcomingEvents.sort(sortFn);
    this.filteredOngoingEvents.sort(sortFn);
    this.filteredPastEvents.sort(sortFn);
  }
}