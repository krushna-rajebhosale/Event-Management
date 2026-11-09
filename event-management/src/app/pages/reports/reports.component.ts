import { ReportsService } from './../../services/reports.service';
import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';


type UiEvent = {
  id: number;
  name: string;
  date: string;
  status: string;
};

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
export class ReportsComponent implements OnInit {
  selectedEvent: UiEvent | null = null;
  reportData: any = null;

  allEvents: UiEvent[] = [];

  isLoading = false;
  errorMessage = '';

  constructor(private ReportsService: ReportsService) {}

  ngOnInit(): void {
    this.loadCompletedEvents();
  }

  loadCompletedEvents(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.ReportsService.getCompletedEvents().subscribe({
      next: (rows: any[]) => {
        this.isLoading = false;

        this.allEvents = (rows || []).map((e: any) => ({
          id: e.id,
          name: e.name || e.event_name,
          date: e.date || e.start_at,
          status: e.status || 'Completed'
        }));
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Failed to load completed events.';
      }
    });
  }

  selectEvent(event: UiEvent): void {
    this.selectedEvent = event;
    this.generateReport(event.id);
  }

  goBackToEvents(): void {
    this.selectedEvent = null;
    this.reportData = null;
    this.errorMessage = '';
  }

  generateReport(eventId: number): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.ReportsService.getEventReport(eventId).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.reportData = res;
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Failed to generate report.';
      }
    });
  }

  exportReport(): void {
    if (!this.selectedEvent || !this.reportData) return;

    let reportContent = `Event Report for: ${this.selectedEvent.name}\n\n`;
    reportContent += `Total Registrations: ${this.reportData.totalRegistrations}\n`;
    reportContent += `Checked In: ${this.reportData.checkedInCount}\n`;
    reportContent += `Attendance Rate: ${this.reportData.attendancePercentage.toFixed(1)}%\n`;
    reportContent += `Total Revenue: INR ${this.reportData.totalRevenue.toFixed(2)}\n\n`;

    reportContent += `Ticket Sales Breakdown:\n`;
    (this.reportData.ticketSales || []).forEach((sale: any) => {
      reportContent += `- ${sale.type}: ${sale.count}\n`;
    });

    reportContent += `\nParticipant Demographics:\n`;
    (this.reportData.demographics || []).forEach((item: any) => {
      reportContent += `- ${item.group}: ${item.count}\n`;
    });

    const encodedUri = encodeURI(`data:text/plain;charset=utf-8,${reportContent}`);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${this.selectedEvent.name}-report.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}