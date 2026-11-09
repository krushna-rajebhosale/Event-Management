import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../services/settings.service';

type EventDefaults = {
  defaultCapacity: number;
  defaultTicketPrice: number;
  defaultCurrency: 'INR' | 'USD' | 'EUR';
};

type RegistrationSettings = {
  enableCustomQuestions: boolean;
  collectPhoneNumber: boolean;
  sendConfirmationEmail: boolean;
};

type EmailTemplates = {
  confirmationSubject: string;
  confirmationBody: string;
  reminderSubject: string;
  reminderBody: string;
};

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  activeSection: 'eventDefaults' | 'registration' | 'email' | 'payment' = 'eventDefaults';

  eventDefaults: EventDefaults = {
    defaultCapacity: 100,
    defaultTicketPrice: 0,
    defaultCurrency: 'INR'
  };

  registrationSettings: RegistrationSettings = {
    enableCustomQuestions: true,
    collectPhoneNumber: false,
    sendConfirmationEmail: true
  };

  emailTemplates: EmailTemplates = {
    confirmationSubject: 'Your registration is confirmed!',
    confirmationBody:
      'Hi {attendeeName},\n\nThank you for registering for {eventName}.\n\nWe look forward to seeing you there!',
    reminderSubject: 'Reminder for your event',
    reminderBody:
      'Hi {attendeeName},\n\nThis is a reminder that {eventName} is happening soon.'
  };

  isLoading = false;
  successMessage = '';
  errorMessage = '';

  constructor(private settingsService: SettingsService) {}

  ngOnInit(): void {
    this.loadAllSettings();
  }

  setActiveSection(section: 'eventDefaults' | 'registration' | 'email' | 'payment'): void {
    this.activeSection = section;
    this.successMessage = '';
    this.errorMessage = '';
  }

  loadAllSettings(): void {
    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.settingsService.getAll().subscribe({
      next: (data: any) => {
        this.isLoading = false;

        if (data?.eventDefaults) {
          this.eventDefaults = {
            defaultCapacity: Number(data.eventDefaults.defaultCapacity ?? 100),
            defaultTicketPrice: Number(data.eventDefaults.defaultTicketPrice ?? 0),
            defaultCurrency: data.eventDefaults.defaultCurrency ?? 'INR'
          };
        }

        if (data?.registrationSettings) {
          this.registrationSettings = {
            enableCustomQuestions: !!data.registrationSettings.enableCustomQuestions,
            collectPhoneNumber: !!data.registrationSettings.collectPhoneNumber,
            sendConfirmationEmail: !!data.registrationSettings.sendConfirmationEmail
          };
        }

        if (data?.emailTemplates) {
          this.emailTemplates = {
            confirmationSubject: data.emailTemplates.confirmationSubject ?? 'Your registration is confirmed!',
            confirmationBody: data.emailTemplates.confirmationBody ?? '',
            reminderSubject: data.emailTemplates.reminderSubject ?? 'Reminder for your event',
            reminderBody: data.emailTemplates.reminderBody ?? ''
          };
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Failed to load settings.';
      }
    });
  }

  saveEventDefaults(): void {
    this.save('eventDefaults', this.eventDefaults);
  }

  saveRegistrationSettings(): void {
    this.save('registrationSettings', this.registrationSettings);
  }

  saveEmailTemplates(): void {
    this.save('emailTemplates', this.emailTemplates);
  }

  private save(key: string, value: any): void {
    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.settingsService.save(key, value).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.successMessage = res?.message || 'Settings saved ✅';
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Failed to save settings.';
      }
    });
  }
}