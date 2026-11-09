import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupportService } from '../../services/support.service';

@Component({
  selector: 'app-help-support',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './help-support.component.html',
  styleUrls: ['./help-support.component.css']
})
export class HelpSupportComponent implements OnInit {

  searchTerm: string = '';

  contact = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };

  isSending = false;
  successMessage = '';
  errorMessage = '';

  faqCategories = [
    {
      title: 'Getting Started',
      questions: [
        { q: 'How do I create my first event?', a: 'Navigate to the "Create Event" page from your dashboard. Fill in the required details like event name, date, and location, and then click "Publish Event".' },
        { q: 'What information is required to create an event?', a: 'At a minimum, you need an event title, start and end dates/times, a venue name, and a registration limit.' }
      ]
    },
    {
      title: 'Managing Registrations',
      questions: [
        { q: 'Where can I see my event attendees?', a: 'Go to the "Registrations" page. First, select the event you want to view, and you will see a detailed list of all registered attendees.' },
        { q: 'Can I export a list of attendees?', a: 'Yes. On the registration details page for an event, click the "Export to CSV" button to download a complete list.' }
      ]
    },
    {
      title: 'Ticketing & Payments',
      questions: [
        { q: 'How do I set up paid tickets?', a: 'In the "Create Event" form, enable the "Ticketing" option. You can then set the ticket type, price, and currency.' },
        { q: 'Which payment gateways are supported?', a: 'You can configure your payment gateway in the "Settings" page under the "Payment" tab. We support integrations with major providers like Stripe and Razorpay.' }
      ]
    }
  ];

  filteredFaqCategories = [...this.faqCategories];

  constructor(private supportService: SupportService) {}

  ngOnInit(): void {}

  filterFaqs(): void {
    const term = this.searchTerm.toLowerCase();
    if (!term) {
      this.filteredFaqCategories = [...this.faqCategories];
      return;
    }

    this.filteredFaqCategories = this.faqCategories.map(category => {
      const filteredQuestions = category.questions.filter(
        q => q.q.toLowerCase().includes(term) || q.a.toLowerCase().includes(term)
      );
      return { ...category, questions: filteredQuestions };
    }).filter(category => category.questions.length > 0);
  }

  submitTicket(): void {
    this.successMessage = '';
    this.errorMessage = '';

    this.isSending = true;

    this.supportService.sendTicket(this.contact).subscribe({
      next: (res) => {
        this.isSending = false;
        this.successMessage = res?.message || 'Ticket sent ✅';
        this.contact = { name: '', email: '', subject: '', message: '' };
      },
      error: (err) => {
        this.isSending = false;
        this.errorMessage = err?.error?.message || 'Failed to send ticket.';
      }
    });
  }
}