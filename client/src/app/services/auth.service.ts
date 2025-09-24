import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
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
    const users = this.getStoredUsers();
    const user = users.find(u => u.username === credentials.username);

    if (user && credentials.password === '123' && user.username === 'super') {
      const response: LoginResponse = {
        success: true,
        user: user,
        token: 'fake-jwt-token'
      };

      this.currentUserSubject.next(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('token', response.token!);

      return of(response);
    } else if (user && this.validatePassword(credentials.password)) {
      const response: LoginResponse = {
        success: true,
        user: user,
        token: 'fake-jwt-token'
      };

      this.currentUserSubject.next(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('token', response.token!);

      return of(response);
    } else {
      return of({
        success: false,
        message: '用户名或密码错误'
      });
    }
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

  private getStoredUsers(): User[] {
    const usersData = localStorage.getItem('users');
    if (!usersData) {
      const defaultUsers: User[] = [
        {
          id: '1',
          username: 'super',
          email: 'super@admin.com',
          roles: ['super-admin'],
          groups: []
        }
      ];
      localStorage.setItem('users', JSON.stringify(defaultUsers));
      return defaultUsers;
    }
    return JSON.parse(usersData);
  }

  private validatePassword(password: string): boolean {
    return password.length >= 3;
  }

  registerUser(user: Partial<User>): Observable<any> {
    const users = this.getStoredUsers();
    const newUser: User = {
      id: Date.now().toString(),
      username: user.username!,
      email: user.email!,
      roles: ['user'],
      groups: [],
      createdAt: new Date()
    };

    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));

    return of({ success: true, user: newUser });
  }

  getAllUsers(): Observable<User[]> {
    return of(this.getStoredUsers());
  }
}