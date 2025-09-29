import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Group, Channel, Message } from '../models/group.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) {}

  getUserGroups(): Observable<Group[]> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return of([]);

    return this.http.get<{ success: boolean; groups: Group[] }>(`${this.API_URL}/groups`)
      .pipe(
        map(response => response.groups || [])
      );
  }

  getAllGroups(): Observable<Group[]> {
    return this.http.get<{ success: boolean; groups: Group[] }>(`${this.API_URL}/groups`)
      .pipe(
        map(response => response.groups || [])
      );
  }

  getGroupById(groupId: string): Observable<Group> {
    return this.http.get<{ success: boolean; group: Group }>(`${this.API_URL}/groups/${groupId}`)
      .pipe(
        map(response => response.group)
      );
  }

  createGroup(groupData: Partial<Group>): Observable<Group> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    const payload = {
      name: groupData.name,
      description: groupData.description,
      createdBy: currentUser.id
    };

    return this.http.post<{ success: boolean; group: Group }>(`${this.API_URL}/groups`, payload)
      .pipe(
        map(response => response.group)
      );
  }

  createChannel(groupId: string, channelData: Partial<Channel>): Observable<Channel> {
    const payload = {
      name: channelData.name,
      description: channelData.description,
      groupId: groupId
    };

    return this.http.post<{ success: boolean; channel: Channel }>(`${this.API_URL}/groups/${groupId}/channels`, payload)
      .pipe(
        map(response => response.channel)
      );
  }

  getGroupChannels(groupId: string): Observable<Channel[]> {
    return this.http.get<Channel[]>(`${this.API_URL}/groups/${groupId}/channels`);
  }

  addUserToGroup(groupId: string, userId: string): Observable<boolean> {
    return this.http.post<{ success: boolean; message: string }>(`${this.API_URL}/groups/${groupId}/members`, { userId })
      .pipe(
        map(response => response.success)
      );
  }

  removeUserFromGroup(groupId: string, userId: string): Observable<boolean> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/groups/${groupId}/members/${userId}`)
      .pipe(
        map(response => response.success)
      );
  }

  sendMessage(groupId: string, channelId: string, content: string): Observable<Message> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    const payload = {
      content: content,
      type: 'text'
    };

    return this.http.post<{ success: boolean; message: Message }>(`${this.API_URL}/groups/${groupId}/channels/${channelId}/messages`, payload)
      .pipe(
        map(response => response.message)
      );
  }

  getChannelMessages(groupId: string, channelId: string, limit: number = 50): Observable<Message[]> {
    return this.http.get<{ success: boolean; messages: Message[] }>(`${this.API_URL}/groups/${groupId}/channels/${channelId}/messages?limit=${limit}`)
      .pipe(
        map(response => response.messages || [])
      );
  }

  // 获取所有可申请的群组（用户未加入的群组）
  getAvailableGroups(): Observable<Group[]> {
    return this.http.get<{ success: boolean; groups: Group[] }>(`${this.API_URL}/groups/available`)
      .pipe(
        map(response => response.groups || [])
      );
  }

  // 申请加入群组
  applyToGroup(groupId: string, message?: string): Observable<boolean> {
    const payload = { message: message || '' };
    return this.http.post<{ success: boolean; message: string }>(`${this.API_URL}/groups/${groupId}/apply`, payload)
      .pipe(
        map(response => response.success)
      );
  }

  // 获取待审核的申请（管理员用）
  getPendingApplications(groupId?: string): Observable<any[]> {
    const url = groupId
      ? `${this.API_URL}/groups/${groupId}/applications`
      : `${this.API_URL}/groups/applications`;

    return this.http.get<{ success: boolean; applications: any[] }>(url)
      .pipe(
        map(response => response.applications || [])
      );
  }

  // 审核申请
  reviewApplication(applicationId: string, action: 'approve' | 'reject', message?: string): Observable<boolean> {
    const payload = { action, message: message || '' };
    return this.http.post<{ success: boolean; message: string }>(`${this.API_URL}/groups/applications/${applicationId}/review`, payload)
      .pipe(
        map(response => response.success)
      );
  }

  // 管理员创建用户
  createUser(userData: { username: string; email: string; password: string; roles?: string[] }): Observable<any> {
    return this.http.post<{ success: boolean; user: any }>(`${this.API_URL}/auth/admin/create-user`, userData)
      .pipe(
        map(response => response.user)
      );
  }

  // 提升用户为群组管理员（仅限超级管理员）
  promoteUserToGroupAdmin(groupId: string, userId: string): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${this.API_URL}/groups/${groupId}/members/${userId}/promote`, {});
  }

  // 撤销用户的群组管理员权限（仅限超级管理员）
  demoteUserFromGroupAdmin(groupId: string, userId: string): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${this.API_URL}/groups/${groupId}/members/${userId}/demote`, {});
  }

  // 删除频道
  deleteChannel(groupId: string, channelId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/groups/${groupId}/channels/${channelId}`);
  }

  // 删除群组
  deleteGroup(groupId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/groups/${groupId}`);
  }
}