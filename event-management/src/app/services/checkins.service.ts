import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class CheckinsService {
  private regBase = 'https://event-management-api-5i6w.onrender.com/api/registrations';
  private checkinBase = 'https://event-management-api-5i6w.onrender.com/api/checkin';

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