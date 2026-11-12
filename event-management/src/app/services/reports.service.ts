import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private base = 'http://localhost:3000/api/reports';

  constructor(private http: HttpClient) {}

  private getUserId(): number {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.id || 0;
  }

  getCompletedEvents() {
    const userId = this.getUserId();
    return this.http.get<any[]>(`${this.base}/events?userId=${userId}`);
  }

  getEventReport(eventId: number) {
    const userId = this.getUserId();
    return this.http.get<any>(`${this.base}/${eventId}?userId=${userId}`);
  }
}