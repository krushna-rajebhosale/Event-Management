import { NgxScannerQrcodeComponent } from 'ngx-scanner-qrcode';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CheckinsService } from '../../services/checkins.service';

type UiEvent = {
  id: number;
  name: string;
  date: string;
  status: string;
};

type UiAttendee = {
  id: number;
  name: string;
  email: string;
  status: string;
  qrCode: string;
};

@Component({
  selector: 'app-check-ins',
  standalone: true,
  imports: [CommonModule, FormsModule,NgxScannerQrcodeComponent],
  templateUrl: './check-ins.component.html',
  styleUrls: ['./check-ins.component.css']
})
export class CheckInsComponent implements OnInit, OnDestroy {

  selectedEvent: UiEvent | null = null;

  currentTime: Date = new Date();
  private timerId: any;

  searchTerm = '';
  lastCheckIn: any = null;

  allEvents: UiEvent[] = [];
  allAttendees: UiAttendee[] = [];
  filteredAttendees: UiAttendee[] = [];

  isLoading = false;
  errorMessage = '';

  isScannerRunning = false;
  isProcessingScan = false;
  lastScannedQr = '';

  scannerConfig: any = {
    fps: 10,
    vibrate: 200,
    isBeep: true
  };

  constructor(private checkinsService: CheckinsService) {}

  ngOnInit(): void {
    this.timerId = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);

    this.loadEvents();
  }

  ngOnDestroy(): void {
    if (this.timerId) clearInterval(this.timerId);
  }

  get checkedInCount(): number {
    return this.filteredAttendees.filter(a => a.status === 'Checked In').length;
  }

  get totalAttendeeCount(): number {
    return this.filteredAttendees.length;
  }

  loadEvents(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.checkinsService.getEvents().subscribe({
      next: (events: any[]) => {
        this.isLoading = false;

        this.allEvents = (events || []).map((e: any) => ({
          id: e.id,
          name: e.name || e.event_name,
          date: e.date || e.start_at,
          status: e.status || 'Upcoming'
        }));
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Failed to load events.';
      }
    });
  }

  selectEvent(event: UiEvent): void {
    this.selectedEvent = event;
    this.searchTerm = '';
    this.lastCheckIn = null;
    this.loadAttendees(event.id);
  }

  goBackToEvents(): void {
    this.selectedEvent = null;
    this.searchTerm = '';
    this.lastCheckIn = null;
    this.allAttendees = [];
    this.filteredAttendees = [];
    this.errorMessage = '';
    this.isScannerRunning = false;
    this.isProcessingScan = false;
    this.lastScannedQr = '';
  }

  loadAttendees(eventId: number): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.checkinsService.getAttendees(eventId).subscribe({
      next: (rows: any[]) => {
        this.isLoading = false;

        this.allAttendees = (rows || []).map((r: any) => ({
          id: r.id,
          name: r.attendee_name,
          email: r.attendee_email,
          status: r.status,
          qrCode: r.qr_code
        }));

        this.filterAttendees();
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Failed to load attendees.';
      }
    });
  }

  filterAttendees(): void {
    const term = this.searchTerm.toLowerCase().trim();

    this.filteredAttendees = this.allAttendees.filter(a =>
      a.name.toLowerCase().includes(term) ||
      a.email.toLowerCase().includes(term)
    );
  }

  checkIn(attendeeId: number): void {
    this.checkinsService.manualCheckIn(attendeeId).subscribe({
      next: (res: any) => {
        const attendee = this.allAttendees.find(a => a.id === attendeeId);
        if (attendee) attendee.status = 'Checked In';

        this.lastCheckIn = {
          name: res?.data?.attendee_name || attendee?.name || 'Checked In',
          status: 'Checked In',
          time: new Date()
        };

        this.filterAttendees();
      },
      error: (err: any) => {
        this.lastCheckIn = {
          name: 'Error',
          status: err?.error?.message || 'Failed',
          time: new Date()
        };
      }
    });
  }

  async startCamera(scanner: any): Promise<void> {
    try {
      await scanner.start();
      this.isScannerRunning = true;
      this.errorMessage = '';
    } catch (err: any) {
      this.errorMessage = 'Unable to start camera. Please allow camera permission.';
    }
  }

  async stopCamera(scanner: any): Promise<void> {
    try {
      await scanner.stop();
    } catch {}
    this.isScannerRunning = false;
    this.isProcessingScan = false;
  }

  onScanResult(event: any): void {
    if (this.isProcessingScan) return;

    const scannedValue =
      event?.[0]?.value ||
      event?.value ||
      event?.data ||
      '';

    if (!scannedValue) return;

    if (scannedValue === this.lastScannedQr) return;

    this.lastScannedQr = scannedValue;
    this.isProcessingScan = true;

    this.checkinsService.scan(scannedValue).subscribe({
      next: (res: any) => {
        const attendee = this.allAttendees.find(a => a.qrCode === scannedValue);
        if (attendee) attendee.status = 'Checked In';

        this.lastCheckIn = {
          name: res?.attendee?.attendee_name || attendee?.name || 'Checked In',
          status: 'Checked In',
          time: new Date()
        };

        this.filterAttendees();

        setTimeout(() => {
          this.isProcessingScan = false;
        }, 1200);
      },
      error: (err: any) => {
        this.lastCheckIn = {
          name: 'Scan Failed',
          status: err?.error?.message || 'Invalid QR',
          time: new Date()
        };

        setTimeout(() => {
          this.isProcessingScan = false;
          this.lastScannedQr = '';
        }, 1200);
      }
    });
  }
}