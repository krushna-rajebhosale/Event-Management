import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private base = 'http://localhost:3000/api/settings';

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<any>(this.base);
  }

  save(key: string, value: any) {
    return this.http.post<any>(this.base, { key, value });
  }
}