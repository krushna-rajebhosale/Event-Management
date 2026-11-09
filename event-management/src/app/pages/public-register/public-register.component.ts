import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { QRCodeComponent } from 'angularx-qrcode';
import { PublicEventService } from '../../services/public-event.service';

@Component({
  selector: 'app-public-register',
  standalone: true,
  imports: [CommonModule, FormsModule, QRCodeComponent],
  templateUrl: './public-register.component.html',
  styleUrls: ['./public-register.component.css']
})
export class PublicRegisterComponent implements OnInit {
  eventId!: number;
  event: any = null;

  name = '';
  email = '';
  mobile = '';
  ticketType = 'General Admission';

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  qrPayload = '';

  constructor(
    private route: ActivatedRoute,
    private publicEvent: PublicEventService
  ) {}

  ngOnInit(): void {
    this.eventId = Number(this.route.snapshot.paramMap.get('eventId'));
    this.loadEvent();
  }

  loadEvent(): void {
    this.isLoading = true;
    this.publicEvent.getEvent(this.eventId).subscribe({
      next: (ev) => {
        this.isLoading = false;
        this.event = ev;
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Event not found or server error.';
      }
    });
  }

  submit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.name.trim() || !this.email.trim() || !this.mobile.trim()) {
      this.errorMessage = 'Please enter name, email, and mobile number.';
      return;
    }

    this.isLoading = true;

    this.publicEvent.register(this.eventId, {
      name: this.name,
      email: this.email,
      mobile: this.mobile,
      ticketType: this.ticketType
    }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successMessage = res?.message || 'Registered ✅';
        this.qrPayload = res.qrPayload;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Registration failed.';
      }
    });
  }

  resetForm(): void {
    this.name = '';
    this.email = '';
    this.mobile = '';
    this.ticketType = 'General Admission';
    this.qrPayload = '';
    this.successMessage = '';
    this.errorMessage = '';
  }

  downloadTicket(): void {
    window.print();
  }
}