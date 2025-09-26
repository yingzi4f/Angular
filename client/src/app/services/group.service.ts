import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
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

    return this.http.get<Group[]>(`${this.API_URL}/groups/user/${currentUser.id}`);
  }

  getAllGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(`${this.API_URL}/admin/groups`);
  }

  createGroup(groupData: Partial<Group>): Observable<Group> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    const payload = {
      name: groupData.name,
      description: groupData.description,
      createdBy: currentUser.id
    };

    return this.http.post<Group>(`${this.API_URL}/groups`, payload);
  }

  createChannel(groupId: string, channelData: Partial<Channel>): Observable<Channel> {
    const payload = {
      name: channelData.name,
      description: channelData.description,
      groupId: groupId
    };

    return this.http.post<Channel>(`${this.API_URL}/groups/${groupId}/channels`, payload);
  }

  getGroupChannels(groupId: string): Observable<Channel[]> {
    return this.http.get<Channel[]>(`${this.API_URL}/groups/${groupId}/channels`);
  }

  addUserToGroup(groupId: string, userId: string): Observable<boolean> {
    return this.http.post<any>(`${this.API_URL}/groups/${groupId}/members`, { userId });
  }

  removeUserFromGroup(groupId: string, userId: string): Observable<boolean> {
    return this.http.delete<any>(`${this.API_URL}/groups/${groupId}/members/${userId}`);
  }

  sendMessage(groupId: string, channelId: string, content: string): Observable<Message> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    const payload = {
      content: content,
      type: 'text'
    };

    return this.http.post<Message>(`${this.API_URL}/groups/${groupId}/channels/${channelId}/messages`, payload);
  }

  getChannelMessages(groupId: string, channelId: string, limit: number = 50): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.API_URL}/groups/${groupId}/channels/${channelId}/messages?limit=${limit}`);
  }
}