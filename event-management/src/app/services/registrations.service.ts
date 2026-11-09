import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class RegistrationsService {
  private baseUrl = 'http://localhost:3000/api/registrations';

  constructor(private http: HttpClient) {}

  private getUserId(): number {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.id || 0;
  }

  getEvents() {
    const userId = this.getUserId();
    return this.http.get<any[]>(`${this.baseUrl}/events?userId=${userId}`);
  }

  getRegistrationsByEvent(eventId: number) {
    const userId = this.getUserId();
    return this.http.get<any[]>(`${this.baseUrl}/event/${eventId}?userId=${userId}`);
  }

  getRegistrationById(id: number) {
    const userId = this.getUserId();
    return this.http.get<any>(`${this.baseUrl}/${id}?userId=${userId}`);
  }

  resendConfirmation(id: number) {
    const userId = this.getUserId();
    return this.http.post<any>(`${this.baseUrl}/${id}/resend-confirmation`, { userId });
  }
}