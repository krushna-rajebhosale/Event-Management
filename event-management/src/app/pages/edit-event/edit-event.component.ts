import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EventsService } from '../../services/events.service';

@Component({
  selector: 'app-edit-event',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-event.component.html',
  styleUrls: ['./edit-event.component.css']
})
export class EditEventComponent implements OnInit {
  eventForm!: FormGroup;
  submitted = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  eventId!: number;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private eventsService: EventsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.eventForm = this.fb.group({
      eventName: ['', Validators.required],
      eventDescription: ['', Validators.required],
      eventCategory: ['', Validators.required],
      organizerName: ['', Validators.required],
      organizerContact: ['', [Validators.required, Validators.email]],

      startDate: ['', Validators.required],
      startTime: ['', Validators.required],
      endDate: ['', Validators.required],
      endTime: ['', Validators.required],

      venueName: ['', Validators.required],
      venueAddress: ['', Validators.required],
      googleMapsLink: [''],

      registrationLimit: [100, [Validators.required, Validators.min(1)]],
      registrationDeadline: ['', Validators.required],
      enableQRCode: [true],

      isTicketed: [false],
      ticketType: ['general'],
      ticketPrice: [0],
      maxTicketsPerUser: [1],

      status: ['published']
    });

    this.eventId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.eventId) this.loadEvent();
  }

  get f() { return this.eventForm.controls; }

  private loadEvent() {
    this.isLoading = true;
    this.errorMessage = '';

    this.eventsService.getEventById(this.eventId).subscribe({
      next: (e: any) => {
        this.isLoading = false;

        // split start_at / end_at to date + time for your form
        const start = new Date(e.start_at);
        const end = new Date(e.end_at);

        const pad = (n: number) => String(n).padStart(2, '0');
        const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const timeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

        this.eventForm.patchValue({
          eventName: e.event_name,
          eventDescription: e.event_description,
          eventCategory: e.event_category,
          organizerName: e.organizer_name,
          organizerContact: e.organizer_contact,

          startDate: dateStr(start),
          startTime: timeStr(start),
          endDate: dateStr(end),
          endTime: timeStr(end),

          venueName: e.venue_name,
          venueAddress: e.venue_address,
          googleMapsLink: e.google_maps_link,

          registrationLimit: e.registration_limit,
          registrationDeadline: e.registration_deadline ? dateStr(new Date(e.registration_deadline)) : '',
          enableQRCode: e.enable_qrcode,

          isTicketed: e.is_ticketed,
          ticketType: e.ticket_type || 'general',
          ticketPrice: e.ticket_price || 0,
          maxTicketsPerUser: e.max_tickets_per_user || 1,

          status: e.status || 'published'
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Failed to load event.';
      }
    });
  }

  onSubmit(isDraft: boolean = false) {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      return;
    }

    const payload = {
      ...this.eventForm.value,
      status: isDraft ? 'draft' : (this.eventForm.value.status || 'published')
    };

    this.isLoading = true;

    this.eventsService.updateEvent(this.eventId, payload).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successMessage = res?.message || 'Event updated ✅';
        setTimeout(() => this.router.navigate(['/dashboard']), 500);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Update failed.';
      }
    });
  }
  isEditMode = true; // in EditEventComponent
}