import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class PublicEventService {
  private baseUrl = 'http://localhost:3000/api/public';

  constructor(private http: HttpClient) {}

  getEvent(eventId: number) {
    return this.http.get<any>(`${this.baseUrl}/events/${eventId}`);
  }

  register(
    eventId: number,
    body: {
      name: string;
      email: string;
      mobile: string;
      ticketType: string;
    }
  ) {
    return this.http.post<any>(`${this.baseUrl}/events/${eventId}/register`, body);
  }
}