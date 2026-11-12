import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private baseUrl = 'http://localhost:3000/api/events';

  constructor(private http: HttpClient) {}

  private getUserId(): number {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.id || 0;
  }

  createEvent(payload: any): Observable<any> {
    return this.http.post(this.baseUrl, payload);
  }

  getEvents(): Observable<any[]> {
    const userId = this.getUserId();
    return this.http.get<any[]>(`${this.baseUrl}?userId=${userId}`);
  }

  getEventById(id: number): Observable<any> {
    const userId = this.getUserId();
    return this.http.get<any>(`${this.baseUrl}/${id}?userId=${userId}`);
  }

  updateEvent(id: number, payload: any): Observable<any> {
    const userId = this.getUserId();
    return this.http.put<any>(`${this.baseUrl}/${id}`, {
      ...payload,
      createdBy: userId
    });
  }

  duplicateEvent(id: number): Observable<any> {
    const userId = this.getUserId();
    return this.http.post<any>(`${this.baseUrl}/${id}/duplicate`, { userId });
  }

  deleteEvent(id: number): Observable<any> {
    const userId = this.getUserId();
    return this.http.delete<any>(`${this.baseUrl}/${id}?userId=${userId}`);
  }
}