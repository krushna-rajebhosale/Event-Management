import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type SupportTicket = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

@Injectable({ providedIn: 'root' })
export class SupportService {
  private baseUrl = 'http://localhost:3000/api/support';

  constructor(private http: HttpClient) {}

  sendTicket(ticket: SupportTicket): Observable<any> {
    return this.http.post(`${this.baseUrl}/ticket`, ticket);
  }
}