import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventMediaService } from '../../services/event-media.service';

type UiEvent = {
  id: number;
  name: string;
  date: string;
  status: string;
};

type UiFile = {
  file_name: string;
  file_path: string;
  mime_type: string;
};

@Component({
  selector: 'app-event-media',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event-media.component.html',
  styleUrls: ['./event-media.component.css']
})
export class EventMediaComponent implements OnInit {
  events: UiEvent[] = [];
  selectedEventId: number | null = null;
  selectedEventStatus = '';

  selectedFiles: File[] = [];
  uploadedFiles: UiFile[] = [];

  isLoading = false;
  message = '';
  error = '';

  constructor(private mediaService: EventMediaService) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.isLoading = true;
    this.error = '';
    this.message = '';

    this.mediaService.getEvents().subscribe({
      next: (rows) => {
        this.isLoading = false;
        this.events = rows || [];
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err?.error?.message || 'Failed to load events.';
      }
    });
  }

  onEventChange(): void {
    this.message = '';
    this.error = '';
    this.selectedFiles = [];
    this.uploadedFiles = [];

    const selected = this.events.find(e => e.id === this.selectedEventId);
    this.selectedEventStatus = selected?.status || '';

    if (this.selectedEventId) {
      this.loadUploadedFiles(this.selectedEventId);
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFiles = input.files ? Array.from(input.files) : [];
  }

  loadUploadedFiles(eventId: number): void {
    this.mediaService.getFiles(eventId).subscribe({
      next: (rows) => {
        this.uploadedFiles = rows || [];
      },
      error: () => {
        this.uploadedFiles = [];
      }
    });
  }

  upload(): void {
    this.message = '';
    this.error = '';

    if (!this.selectedEventId) {
      this.error = 'Please select an event first.';
      return;
    }

    if (this.selectedFiles.length === 0) {
      this.error = 'Please select images/videos.';
      return;
    }

    this.isLoading = true;

    const formData = new FormData();
    this.selectedFiles.forEach((file) => formData.append('files', file));

    this.mediaService.uploadFiles(this.selectedEventId, formData).subscribe({
      next: () => {
        this.isLoading = false;
        this.message = 'Files uploaded successfully ✅';
        this.selectedFiles = [];
        this.loadUploadedFiles(this.selectedEventId!);
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err?.error?.message || 'Upload failed.';
      }
    });
  }

  sendToAll(): void {
    this.message = '';
    this.error = '';

    if (!this.selectedEventId) {
      this.error = 'Please select an event first.';
      return;
    }

    if (this.uploadedFiles.length === 0) {
      this.error = 'No uploaded files found for this event.';
      return;
    }

    this.isLoading = true;

    this.mediaService.sendToAll(this.selectedEventId).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.message = `Media links sent successfully ✅ (Sent: ${res?.sentTo || 0}, Failed: ${res?.failed || 0})`;
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err?.error?.message || 'Send failed.';
      }
    });
  }

  sendCertificates(): void {
    this.message = '';
    this.error = '';

    if (!this.selectedEventId) {
      this.error = 'Please select an event first.';
      return;
    }

    this.isLoading = true;

    this.mediaService.sendCertificates(this.selectedEventId).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.message = `Certificates sent ✅ (Sent: ${res?.sentTo || 0}, Skipped: ${res?.skipped || 0}, Failed: ${res?.failed || 0})`;
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err?.error?.message || 'Failed to send certificates.';
      }
    });
  }
}