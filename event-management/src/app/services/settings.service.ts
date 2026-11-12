import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private base = 'https://event-management-api-5i6w.onrender.com/api/settings';

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<any>(this.base);
  }

  save(key: string, value: any) {
    return this.http.post<any>(this.base, { key, value });
  }
}