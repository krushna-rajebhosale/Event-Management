import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class CheckinsService {
  private regBase = 'http://localhost:3000/api/registrations';
  private checkinBase = 'http://localhost:3000/api/checkin';

  constructor(private http: HttpClient) {}

  private getUserId(): number {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.id || 0;
  }

  getEvents() {
    const userId = this.getUserId();
    return this.http.get<any[]>(`${this.regBase}/events?userId=${userId}`);
  }

  getAttendees(eventId: number) {
    const userId = this.getUserId();
    return this.http.get<any[]>(`${this.regBase}/event/${eventId}/attendees?userId=${userId}`);
  }

  manualCheckIn(registrationId: number) {
    const userId = this.getUserId();
    return this.http.post(`${this.regBase}/${registrationId}/checkin`, { userId });
  }

  scan(qrPayload: string) {
    const userId = this.getUserId();
    return this.http.post(`${this.checkinBase}/scan`, { qrPayload, userId });
  }
}