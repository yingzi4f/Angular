import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  roles: string[];
  isOnline?: boolean;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly API_URL = 'http://localhost:3000/api/profile';

  constructor(private http: HttpClient) {}

  // Get current user profile
  getMyProfile(): Observable<UserProfile> {
    return this.http.get<{ success: boolean; user: UserProfile }>(`${this.API_URL}/me`)
      .pipe(
        map(response => response.user)
      );
  }

  // Update profile
  updateProfile(profileData: { username?: string; email?: string }): Observable<UserProfile> {
    return this.http.put<{ success: boolean; user: UserProfile; message: string }>(`${this.API_URL}/me`, profileData)
      .pipe(
        map(response => response.user)
      );
  }

  // Upload avatar
  uploadAvatar(file: File): Observable<{ success: boolean; message: string; avatar: string; user: UserProfile }> {
    const formData = new FormData();
    formData.append('avatar', file);

    return this.http.post<{ success: boolean; message: string; avatar: string; user: UserProfile }>(
      `${this.API_URL}/avatar`,
      formData
    );
  }

  // Delete avatar
  deleteAvatar(): Observable<{ success: boolean; message: string; user: UserProfile }> {
    return this.http.delete<{ success: boolean; message: string; user: UserProfile }>(`${this.API_URL}/avatar`);
  }

  // Get avatar URL
  getAvatarUrl(avatar: string | null | undefined): string {
    if (!avatar) {
      return '/assets/default-avatar.png';
    }

    // If it's already a full URL, return it
    if (avatar.startsWith('http')) {
      return avatar;
    }

    // If it starts with /uploads, build full URL
    if (avatar.startsWith('/uploads')) {
      return `http://localhost:3000${avatar}`;
    }

    // Otherwise build the full path
    return `http://localhost:3000/uploads/avatars/${avatar}`;
  }
}