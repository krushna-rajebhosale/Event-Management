import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RegistrationsService } from '../../services/registrations.service';

declare var bootstrap: any;

type UiEvent = {
  id: number;
  name: string;
  date: string;
  status: string;
  registrationCount: number;
  capacity: number;
};

type UiRegistration = {
  id: number;
  eventId: number;
  name: string;
  email: string;
  ticketType: string;
  registrationDate: Date;
  status: 'Checked In' | 'Pending' | 'Cancelled';
};

@Component({
  selector: 'app-registrations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registrations.component.html',
  styleUrls: ['./registrations.component.css']
})
export class RegistrationsComponent implements OnInit {

  selectedEvent: UiEvent | null = null;
  searchTerm = '';
  sortOption: 'date' | 'name' = 'date';

  allEvents: UiEvent[] = [];
  allRegistrations: UiRegistration[] = [];
  filteredRegistrations: UiRegistration[] = [];

  isLoading = false;
  errorMessage = '';

  selectedRegistration: any = null;
  toastMessage = '';
  toastClass = 'text-bg-success';

  constructor(private registrationsService: RegistrationsService) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.registrationsService.getEvents().subscribe({
      next: (events: any[]) => {
        this.isLoading = false;

        this.allEvents = (events || []).map(e => ({
          id: e.id,
          name: e.name,
          date: e.date,
          status: e.status,
          registrationCount: Number(e.registrationCount || 0),
          capacity: Number(e.capacity || 0),
        }));
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Failed to load events.';
      }
    });
  }

  selectEvent(event: UiEvent): void {
    this.selectedEvent = event;
    this.searchTerm = '';
    this.sortOption = 'date';
    this.loadRegistrations(event.id);
  }

  goBackToEvents(): void {
    this.selectedEvent = null;
    this.allRegistrations = [];
    this.filteredRegistrations = [];
    this.searchTerm = '';
    this.errorMessage = '';
  }

  loadRegistrations(eventId: number): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.registrationsService.getRegistrationsByEvent(eventId).subscribe({
      next: (rows: any[]) => {
        this.isLoading = false;

        this.allRegistrations = (rows || []).map(r => ({
          id: r.id,
          eventId,
          name: r.attendee_name,
          email: r.attendee_email,
          ticketType: r.ticket_type || 'General Admission',
          registrationDate: new Date(r.registered_at),
          status: r.status
        }));

        this.filterAndSort();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Failed to load registrations.';
      }
    });
  }

  filterAndSort(): void {
    if (!this.selectedEvent) return;

    let list = [...this.allRegistrations];
    const term = this.searchTerm.toLowerCase().trim();

    if (term) {
      list = list.filter(r =>
        r.name.toLowerCase().includes(term) ||
        r.email.toLowerCase().includes(term)
      );
    }

    list.sort((a, b) => {
      if (this.sortOption === 'name') return a.name.localeCompare(b.name);
      return b.registrationDate.getTime() - a.registrationDate.getTime();
    });

    this.filteredRegistrations = list;
  }

  viewDetails(regId: number): void {
    this.registrationsService.getRegistrationById(regId).subscribe({
      next: (reg: any) => {
        this.selectedRegistration = reg;

        const modalElement = document.getElementById('registrationDetailsModal');
        if (modalElement) {
          const modal = new bootstrap.Modal(modalElement);
          modal.show();
        }
      },
      error: (err) => {
        this.showToast(err?.error?.message || 'Failed to load registration details ❌', true);
      }
    });
  }

  resendConfirmation(regId: number): void {
    this.registrationsService.resendConfirmation(regId).subscribe({
      next: (res: any) => {
        this.showToast(res?.message || 'Confirmation email resent ✅', false);
      },
      error: (err) => {
        this.showToast(err?.error?.message || 'Failed to resend confirmation ❌', true);
      }
    });
  }

  showToast(message: string, isError: boolean = false): void {
    this.toastMessage = message;
    this.toastClass = isError ? 'text-bg-danger' : 'text-bg-success';

    const toastElement = document.getElementById('actionToast');
    if (toastElement) {
      const toast = new bootstrap.Toast(toastElement);
      toast.show();
    }
  }

  exportToCSV(): void {
    if (!this.selectedEvent) return;

    const headers = ['ID', 'Name', 'Email', 'Event', 'Ticket Type', 'Registration Date', 'Status'];
    const rows = this.filteredRegistrations.map(reg =>
      [
        reg.id,
        `"${reg.name}"`,
        reg.email,
        `"${this.selectedEvent!.name}"`,
        reg.ticketType,
        reg.registrationDate.toISOString(),
        reg.status
      ].join(',')
    );

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);

    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${this.selectedEvent.name}-registrations.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}