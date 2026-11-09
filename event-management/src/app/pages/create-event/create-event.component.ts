import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EventsService } from '../../services/events.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-event.component.html',
  styleUrls: ['./create-event.component.css']
})
export class CreateEventComponent implements OnInit {
  eventForm!: FormGroup;
  submitted = false;

  isLoading = false;
  errorMessage = '';
  successMessage = '';
  publicRegistrationUrl = '';
  showUrlAlert = false;

  bannerFile: File | null = null;
  additionalFiles: File[] = [];

  constructor(
    private fb: FormBuilder,
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
      maxTicketsPerUser: [1]
    });
  }

  get f() {
    return this.eventForm.controls;
  }

  onBannerSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.bannerFile = input.files?.[0] || null;
  }

  onAdditionalSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.additionalFiles = input.files ? Array.from(input.files) : [];
  }

  copyLink(): void {
    if (!this.publicRegistrationUrl) return;
    navigator.clipboard.writeText(this.publicRegistrationUrl);
    this.showUrlAlert = true;
    setTimeout(() => (this.showUrlAlert = false), 3000);
  }

  onSubmit(isDraft: boolean = false): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      return;
    }

    const user = JSON.parse(localStorage.getItem('user') || 'null');

    const payload = {
      ...this.eventForm.value,
      createdBy: user?.id || null,
      status: isDraft ? 'draft' : 'published',
      bannerImageName: this.bannerFile?.name || null,
      additionalImageNames: this.additionalFiles.map(f => f.name)
    };

    this.isLoading = true;

    this.eventsService.createEvent(payload).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successMessage = res?.message || 'Event created ✅';

        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 700);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Failed to create event.';
      }
    });
  }
}