import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { Group, Channel, Message } from '../models/group.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  private groupsSubject = new BehaviorSubject<Group[]>([]);
  public groups$ = this.groupsSubject.asObservable();

  constructor(private authService: AuthService) {
    this.loadGroups();
  }

  private loadGroups(): void {
    const groupsData = localStorage.getItem('groups');
    if (groupsData) {
      this.groupsSubject.next(JSON.parse(groupsData));
    } else {
      this.groupsSubject.next([]);
    }
  }

  private saveGroups(groups: Group[]): void {
    localStorage.setItem('groups', JSON.stringify(groups));
    this.groupsSubject.next(groups);
  }

  getUserGroups(): Observable<Group[]> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return of([]);

    const allGroups = this.groupsSubject.value;
    const userGroups = allGroups.filter(group =>
      group.memberIds.includes(currentUser.id) ||
      group.adminIds.includes(currentUser.id) ||
      this.authService.isSuperAdmin()
    );

    return of(userGroups);
  }

  getAllGroups(): Observable<Group[]> {
    return of(this.groupsSubject.value);
  }

  createGroup(groupData: Partial<Group>): Observable<Group> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    const newGroup: Group = {
      id: Date.now().toString(),
      name: groupData.name!,
      description: groupData.description || '',
      adminIds: [currentUser.id],
      memberIds: [currentUser.id],
      channels: [{
        id: Date.now().toString() + '_general',
        name: 'general',
        description: '默认频道',
        groupId: Date.now().toString(),
        memberIds: [currentUser.id],
        messages: [],
        createdAt: new Date()
      }],
      createdBy: currentUser.id,
      createdAt: new Date()
    };

    const groups = this.groupsSubject.value;
    groups.push(newGroup);
    this.saveGroups(groups);

    return of(newGroup);
  }

  createChannel(groupId: string, channelData: Partial<Channel>): Observable<Channel> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    const groups = this.groupsSubject.value;
    const groupIndex = groups.findIndex(g => g.id === groupId);

    if (groupIndex === -1) throw new Error('Group not found');

    const group = groups[groupIndex];
    if (!group.adminIds.includes(currentUser.id) && !this.authService.isSuperAdmin()) {
      throw new Error('Insufficient permissions');
    }

    const newChannel: Channel = {
      id: Date.now().toString(),
      name: channelData.name!,
      description: channelData.description || '',
      groupId: groupId,
      memberIds: [...group.memberIds],
      messages: [],
      createdAt: new Date()
    };

    group.channels.push(newChannel);
    this.saveGroups(groups);

    return of(newChannel);
  }

  addUserToGroup(groupId: string, userId: string): Observable<boolean> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return of(false);

    const groups = this.groupsSubject.value;
    const groupIndex = groups.findIndex(g => g.id === groupId);

    if (groupIndex === -1) return of(false);

    const group = groups[groupIndex];
    if (!group.adminIds.includes(currentUser.id) && !this.authService.isSuperAdmin()) {
      return of(false);
    }

    if (!group.memberIds.includes(userId)) {
      group.memberIds.push(userId);
      group.channels.forEach(channel => {
        if (!channel.memberIds.includes(userId)) {
          channel.memberIds.push(userId);
        }
      });
      this.saveGroups(groups);
    }

    return of(true);
  }

  removeUserFromGroup(groupId: string, userId: string): Observable<boolean> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return of(false);

    const groups = this.groupsSubject.value;
    const groupIndex = groups.findIndex(g => g.id === groupId);

    if (groupIndex === -1) return of(false);

    const group = groups[groupIndex];
    if (!group.adminIds.includes(currentUser.id) && !this.authService.isSuperAdmin()) {
      return of(false);
    }

    group.memberIds = group.memberIds.filter(id => id !== userId);
    group.adminIds = group.adminIds.filter(id => id !== userId);
    group.channels.forEach(channel => {
      channel.memberIds = channel.memberIds.filter(id => id !== userId);
    });

    this.saveGroups(groups);
    return of(true);
  }

  sendMessage(channelId: string, content: string): Observable<Message> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    const groups = this.groupsSubject.value;
    let targetGroup: Group | undefined;
    let targetChannel: Channel | undefined;

    for (const group of groups) {
      const channel = group.channels.find(c => c.id === channelId);
      if (channel) {
        targetGroup = group;
        targetChannel = channel;
        break;
      }
    }

    if (!targetGroup || !targetChannel) {
      throw new Error('Channel not found');
    }

    if (!targetChannel.memberIds.includes(currentUser.id)) {
      throw new Error('User not member of channel');
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      content: content,
      senderId: currentUser.id,
      senderUsername: currentUser.username,
      channelId: channelId,
      timestamp: new Date(),
      type: 'text'
    };

    targetChannel.messages.push(newMessage);
    this.saveGroups(groups);

    return of(newMessage);
  }

  getChannelMessages(channelId: string): Observable<Message[]> {
    const groups = this.groupsSubject.value;

    for (const group of groups) {
      const channel = group.channels.find(c => c.id === channelId);
      if (channel) {
        return of(channel.messages.slice(-20));
      }
    }

    return of([]);
  }
}