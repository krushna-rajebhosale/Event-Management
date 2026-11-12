import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class EventMediaService {
  private base = 'http://localhost:3000/api/event-media';

  constructor(private http: HttpClient) {}

  private getUserId(): number {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.id || 0;
  }

  getEvents() {
    const userId = this.getUserId();
    return this.http.get<any[]>(`${this.base}/events?userId=${userId}`);
  }

  uploadFiles(eventId: number, formData: FormData) {
    const userId = this.getUserId();
    formData.append('userId', String(userId));
    return this.http.post(`${this.base}/${eventId}/upload`, formData);
  }

  getFiles(eventId: number) {
    const userId = this.getUserId();
    return this.http.get<any[]>(`${this.base}/${eventId}/files?userId=${userId}`);
  }

  sendToAll(eventId: number) {
    const userId = this.getUserId();
    return this.http.post(`${this.base}/${eventId}/send`, { userId });
  }

  sendCertificates(eventId: number) {
    const userId = this.getUserId();
    return this.http.post(`${this.base}/${eventId}/send-certificates`, { userId });
  }
}