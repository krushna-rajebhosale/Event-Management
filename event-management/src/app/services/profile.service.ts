import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private base = 'https://event-management-api-5i6w.onrender.com/api/profile';

  constructor(private http: HttpClient) {}

  getProfile(id: number) {
    return this.http.get<any>(`${this.base}/${id}`);
  }

  updateProfile(id: number, payload: any) {
    return this.http.put<any>(`${this.base}/${id}`, payload);
  }

  changePassword(id: number, payload: any) {
    return this.http.put<any>(`${this.base}/${id}/password`, payload);
  }
}