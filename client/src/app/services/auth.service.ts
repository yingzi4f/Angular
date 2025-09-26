import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { User, LoginRequest, LoginResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private readonly API_URL = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      this.currentUserSubject.next(JSON.parse(savedUser));
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap((response: LoginResponse) => {
          if (response.success && response.user && response.token) {
            this.currentUserSubject.next(response.user);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            localStorage.setItem('token', response.token);
          }
        })
      );
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user ? user.roles.includes(role) : false;
  }

  isSuperAdmin(): boolean {
    return this.hasRole('super-admin');
  }

  isGroupAdmin(): boolean {
    return this.hasRole('group-admin');
  }

  // Add user management methods
  deleteUser(userId: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/admin/users/${userId}`);
  }

  updateUserRoles(userId: string, roles: string[]): Observable<any> {
    return this.http.put(`${this.API_URL}/admin/users/${userId}/roles`, { roles });
  }

  registerUser(user: any): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/auth/register`, user);
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.API_URL}/admin/users`);
  }
}