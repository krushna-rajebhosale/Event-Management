import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private dashboardBase = 'http://localhost:3000/api/dashboard';
  private eventsBase = 'http://localhost:3000/api/events';

  constructor(private http: HttpClient) {}

  private getUserId(): number {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.id || 0;
  }

  getSummary() {
    const userId = this.getUserId();
    return this.http.get<any>(`${this.dashboardBase}/summary?userId=${userId}`);
  }

  getEventById(id: number) {
    const userId = this.getUserId();
    return this.http.get<any>(`${this.eventsBase}/${id}?userId=${userId}`);
  }

  duplicateEvent(id: number) {
    const userId = this.getUserId();
    return this.http.post<any>(`${this.eventsBase}/${id}/duplicate`, { userId });
  }

  deleteEvent(id: number) {
    const userId = this.getUserId();
    return this.http.delete<any>(`${this.eventsBase}/${id}?userId=${userId}`);
  }
}