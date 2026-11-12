import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = 'https://event-management-api-5i6w.onrender.com/api/auth';

  constructor(private http: HttpClient) {}

  register(fullName: string, email: string, password: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/register`, { fullName, email, password });
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/login`, { email, password });
  }
}