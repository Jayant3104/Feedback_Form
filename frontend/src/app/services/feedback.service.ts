import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FormData } from '../models/feedback.model';

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private baseUrl = '/api';

  constructor(private http: HttpClient) {}

  sendOtp(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/send-otp`, { email });
  }

  verifyOtp(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/verify-otp`, { email, otp });
  }

  submitFeedback(data: FormData): Observable<any> {
    const token = localStorage.getItem('feedback_token');
    const headers = new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
    return this.http.post(`${this.baseUrl}/submit-feedback`, data, { headers });
  }
}
