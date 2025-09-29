import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { GroupService } from '../../services/group.service';
import { User } from '../../models/user.model';
import { Group, Channel, Message } from '../../models/group.model';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-container">
      <!-- Sidebar -->
      <div class="sidebar">
        <div class="sidebar-header">
          <h3>{{ currentGroup?.name || 'Loading Group...' }}</h3>
          <button class="btn btn-secondary btn-small" (click)="goBack()">
            返回
          </button>
        </div>

        <div class="channels-section">
          <div class="section-header">
            <h4>频道</h4>
            <button
              *ngIf="canManageChannels()"
              class="btn btn-primary btn-small"
              (click)="showCreateChannel = true">
              +
            </button>
          </div>

          <div class="channels-list">
            <div
              *ngFor="let channel of currentGroup?.channels"
              class="channel-item"
              [class.active]="currentChannel?.id === channel.id"
              (click)="selectChannel(channel)">
              # {{ channel.name }}
            </div>
          </div>
        </div>

        <div class="members-section">
          <h4>成员 ({{ getMemberCount() }})</h4>
          <div class="members-list">
            <div *ngFor="let member of currentGroup?.memberIds" class="member-item">
              {{ getMemberUsername(member._id || member.id || member) }}
              <span *ngIf="isGroupAdmin(member._id || member.id || member)" class="admin-label">管理员</span>
            </div>
          </div>
        </div>

        <!-- Group Management for Admins -->
        <div *ngIf="canManageGroup()" class="group-management">
          <h4>群组管理</h4>
          <button class="btn btn-primary btn-small" (click)="showAddUser = true">
            添加成员
          </button>
          <button class="btn btn-danger btn-small" (click)="showManageMembers = true">
            管理成员
          </button>
        </div>
      </div>

      <!-- Main Chat Area -->
      <div class="chat-main">
        <div class="chat-header" *ngIf="currentChannel">
          <h3># {{ currentChannel.name }}</h3>
          <p *ngIf="currentChannel.description">{{ currentChannel.description }}</p>
        </div>

        <div class="chat-messages" *ngIf="currentChannel" #messagesContainer>
          <div *ngFor="let message of messages" class="message">
            <div class="message-header">
              <strong>{{ message.senderUsername }}</strong>
              <span class="message-time">{{ formatTime(message.timestamp) }}</span>
            </div>
            <div class="message-content">{{ message.content }}</div>
          </div>
        </div>

        <div class="chat-input" *ngIf="currentGroup">
          <form (ngSubmit)="sendMessage()">
            <input
              type="text"
              [(ngModel)]="newMessage"
              name="newMessage"
              placeholder="输入消息..."
              class="message-input">
            <button type="submit" class="btn btn-primary">发送</button>
          </form>
        </div>
      </div>

      <!-- Create Channel Modal -->
      <div *ngIf="showCreateChannel" class="modal">
        <div class="modal-content">
          <h3>创建新频道</h3>
          <form (ngSubmit)="createChannel()">
            <div class="form-group">
              <label>频道名称:</label>
              <input
                type="text"
                [(ngModel)]="newChannelName"
                name="channelName"
                required
                placeholder="请输入频道名称">
            </div>
            <div class="form-group">
              <label>频道描述:</label>
              <input
                type="text"
                [(ngModel)]="newChannelDescription"
                name="channelDescription"
                placeholder="请输入频道描述（可选）">
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="cancelCreateChannel()">
                取消
              </button>
              <button type="submit" class="btn btn-primary">创建</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Add User Modal -->
      <div *ngIf="showAddUser" class="modal">
        <div class="modal-content">
          <h3>添加成员</h3>
          <div class="users-to-add">
            <div *ngFor="let user of usersNotInGroup" class="user-option">
              <span>{{ user.username }} ({{ user.email }})</span>
              <button *ngIf="user._id || user.id" class="btn btn-primary btn-small" (click)="addUserToGroup(user._id || user.id!)">
                添加
              </button>
            </div>
            <div *ngIf="usersNotInGroup.length === 0" class="no-users">
              没有可添加的用户
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="showAddUser = false">关闭</button>
          </div>
        </div>
      </div>

      <!-- Manage Members Modal -->
      <div *ngIf="showManageMembers" class="modal">
        <div class="modal-content">
          <h3>管理成员</h3>
          <div class="members-management">
            <div *ngFor="let member of currentGroup?.memberIds" class="member-management-item">
              <div class="member-info">
                <span>{{ getMemberUsername(member._id || member.id || member) }}</span>
                <span *ngIf="isGroupAdmin(member._id || member.id || member)" class="admin-label">群组管理员</span>
              </div>
              <div class="member-actions">
                <!-- Super Admin can promote/demote group admins -->
                <button
                  *ngIf="authService.isSuperAdmin() && (member._id || member.id || member) !== currentUser?.id && !isGroupAdmin(member._id || member.id || member)"
                  class="btn btn-success btn-small"
                  (click)="promoteToGroupAdmin(member._id || member.id || member)">
                  提升为管理员
                </button>
                <button
                  *ngIf="authService.isSuperAdmin() && (member._id || member.id || member) !== currentUser?.id && isGroupAdmin(member._id || member.id || member)"
                  class="btn btn-warning btn-small"
                  (click)="demoteFromGroupAdmin(member._id || member.id || member)">
                  撤销管理员
                </button>
                <!-- Regular remove member button -->
                <button
                  *ngIf="(member._id || member.id || member) !== currentUser?.id && !isGroupAdmin(member._id || member.id || member)"
                  class="btn btn-danger btn-small"
                  (click)="removeMember(member._id || member.id || member)">
                  移除
                </button>
              </div>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="showManageMembers = false">关闭</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      display: flex;
      height: 100vh;
    }

    .sidebar {
      width: 300px;
      background-color: #2c3e50;
      color: white;
      display: flex;
      flex-direction: column;
    }

    .sidebar-header {
      padding: 20px;
      border-bottom: 1px solid #34495e;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .sidebar-header h3 {
      margin: 0;
      font-size: 18px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .section-header h4 {
      margin: 0;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
      opacity: 0.8;
    }

    .channels-section, .members-section, .group-management {
      padding: 20px;
      border-bottom: 1px solid #34495e;
    }

    .channels-list {
      max-height: 200px;
      overflow-y: auto;
    }

    .channel-item {
      padding: 8px 12px;
      cursor: pointer;
      border-radius: 4px;
      margin-bottom: 4px;
      transition: background-color 0.2s;
    }

    .channel-item:hover {
      background-color: #34495e;
    }

    .channel-item.active {
      background-color: #3498db;
    }

    .members-list {
      max-height: 150px;
      overflow-y: auto;
    }

    .member-item {
      padding: 4px 0;
      font-size: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .admin-label {
      background-color: #f39c12;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 10px;
    }

    .group-management {
      margin-top: auto;
    }

    .group-management button {
      margin: 5px 0;
      width: 100%;
    }

    .chat-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      background-color: white;
    }

    .chat-header {
      padding: 20px;
      border-bottom: 1px solid #ecf0f1;
      background-color: #fff;
    }

    .chat-header h3 {
      margin: 0;
      color: #2c3e50;
    }

    .chat-header p {
      margin: 5px 0 0 0;
      color: #7f8c8d;
      font-size: 14px;
    }

    .chat-messages {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      background-color: #ecf0f1;
    }

    .message {
      background-color: white;
      margin-bottom: 15px;
      padding: 12px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .message-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .message-header strong {
      color: #2c3e50;
    }

    .message-time {
      color: #7f8c8d;
      font-size: 12px;
    }

    .message-content {
      color: #2c3e50;
      line-height: 1.4;
    }

    .chat-input {
      padding: 20px;
      border-top: 1px solid #ecf0f1;
      background-color: white;
    }

    .chat-input form {
      display: flex;
      gap: 10px;
    }

    .message-input {
      flex: 1;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 25px;
      font-size: 14px;
      outline: none;
    }

    .message-input:focus {
      border-color: #3498db;
    }

    .btn-small {
      padding: 4px 8px;
      font-size: 12px;
    }

    .modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .modal-content {
      background-color: white;
      padding: 30px;
      border-radius: 8px;
      width: 90%;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }

    .users-to-add, .members-management {
      max-height: 300px;
      overflow-y: auto;
    }

    .user-option, .member-management-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      border-bottom: 1px solid #eee;
    }

    .member-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .member-actions {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .no-users {
      text-align: center;
      color: #666;
      padding: 20px;
    }
  `]
})
export class ChatComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  currentGroup: Group | null = null;
  currentChannel: Channel | null = null;
  messages: Message[] = [];
  newMessage = '';
  allUsers: User[] = [];

  showCreateChannel = false;
  showAddUser = false;
  showManageMembers = false;
  newChannelName = '';
  newChannelDescription = '';

  private routeSubscription: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public authService: AuthService,
    private groupService: GroupService
  ) {
    console.log('ChatComponent constructor called');
  }

  getCurrentUrl(): string {
    return this.router.url;
  }

  ngOnInit(): void {
    console.log('ChatComponent ngOnInit called');
    // Fixed double event binding issue - no more duplicate messages
    this.currentUser = this.authService.getCurrentUser();
    console.log('Current user:', this.currentUser);
    this.loadAllUsers();

    this.routeSubscription = this.route.params.subscribe(params => {
      console.log('Route params received:', params);
      const groupId = params['id'];
      console.log('Group ID from params:', groupId);
      if (groupId) {
        this.loadGroup(groupId);
      } else {
        console.log('No group ID found in params');
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription.unsubscribe();
  }

  loadGroup(groupId: string): void {
    console.log('Loading group with ID:', groupId);
    this.groupService.getGroupById(groupId).subscribe({
      next: (group) => {
        console.log('Loaded group with channels:', group);
        this.currentGroup = group;
        if (this.currentGroup && this.currentGroup.channels && this.currentGroup.channels.length > 0) {
          console.log('Auto-selecting first channel:', this.currentGroup.channels[0]);
          this.selectChannel(this.currentGroup.channels[0]);
        } else {
          console.log('No channels found in group:', this.currentGroup);
        }
      },
      error: (error) => {
        console.error('Error loading group:', error);
        this.currentGroup = null;
      }
    });
  }

  loadAllUsers(): void {
    this.authService.getAllUsers().subscribe({
      next: (users) => {
        this.allUsers = users;
        console.log('All users loaded:', users);
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.allUsers = [];
      }
    });
  }

  selectChannel(channel: Channel): void {
    this.currentChannel = channel;
    this.loadMessages();
  }

  loadMessages(): void {
    if (this.currentChannel && this.currentGroup && (this.currentGroup.id || this.currentGroup._id) && (this.currentChannel.id || this.currentChannel._id)) {
      const groupId = this.currentGroup.id || this.currentGroup._id!;
      const channelId = this.currentChannel.id || this.currentChannel._id!;
      this.groupService.getChannelMessages(groupId, channelId).subscribe(messages => {
        this.messages = messages;
      });
    }
  }

  sendMessage(): void {
    console.log('sendMessage called');
    console.log('newMessage:', this.newMessage);
    console.log('currentChannel:', this.currentChannel);
    console.log('currentGroup:', this.currentGroup);

    if (!this.newMessage.trim()) {
      console.log('Empty message, returning');
      return;
    }

    if (!this.currentGroup) {
      console.log('No current group, returning');
      return;
    }

    // 如果没有选中频道，自动选择第一个频道或创建默认频道
    if (!this.currentChannel) {
      console.log('No current channel, trying to select first channel');
      if (this.currentGroup.channels && this.currentGroup.channels.length > 0) {
        this.selectChannel(this.currentGroup.channels[0]);
        console.log('Selected first channel:', this.currentChannel);
      } else {
        // 如果没有频道，使用默认的general频道ID
        console.log('No channels available, using default general channel');
        const groupId = this.currentGroup.id || this.currentGroup._id!;
        // 使用已知的general频道ID
        const defaultChannelId = '68d5ebaa3389ae60a065a181'; // general频道的固定ID
        console.log('Using default channel ID:', defaultChannelId);
        console.log('Force recompile trigger');
        this.groupService.sendMessage(groupId, defaultChannelId, this.newMessage).subscribe({
          next: (message) => {
            this.newMessage = '';
            console.log('Message sent successfully:', message);
            // Reload messages from server to avoid duplicates
            this.loadMessages();
          },
          error: (error) => {
            console.error('Error sending message:', error);
          }
        });
        return;
      }
    }

    const groupId = this.currentGroup.id || this.currentGroup._id!;
    const channelId = this.currentChannel!.id || this.currentChannel!._id!;
    console.log('Sending message with groupId:', groupId, 'channelId:', channelId);

    this.groupService.sendMessage(groupId, channelId, this.newMessage).subscribe({
      next: (message) => {
        this.newMessage = '';
        console.log('Message sent successfully:', message);
        // Reload messages from server to avoid duplicates
        this.loadMessages();
      },
      error: (error) => {
        console.error('Error sending message:', error);
      }
    });
  }

  createChannel(): void {
    if (!this.newChannelName.trim() || !this.currentGroup) return;

    const groupId = this.currentGroup.id || this.currentGroup._id!;
    this.groupService.createChannel(groupId, {
      name: this.newChannelName,
      description: this.newChannelDescription
    }).subscribe(channel => {
      if (!this.currentGroup!.channels) {
        this.currentGroup!.channels = [];
      }
      this.currentGroup!.channels.push(channel);
      this.cancelCreateChannel();
    });
  }

  cancelCreateChannel(): void {
    this.showCreateChannel = false;
    this.newChannelName = '';
    this.newChannelDescription = '';
  }

  addUserToGroup(userId: string): void {
    if (!this.currentGroup) return;

    const groupId = this.currentGroup.id || this.currentGroup._id!;
    console.log('Adding user to group:', { groupId, userId, currentGroup: this.currentGroup });

    this.groupService.addUserToGroup(groupId, userId).subscribe({
      next: (success) => {
        console.log('Add user response:', success);
        if (success) {
          this.currentGroup!.memberIds.push(userId);
          this.showAddUser = false;
          alert('用户已添加到群组');
        } else {
          alert('添加用户失败');
        }
      },
      error: (error) => {
        console.error('Add user error:', error);
        alert('添加用户时发生错误：' + (error.message || '未知错误'));
      }
    });
  }

  removeMember(memberId: string): void {
    if (!this.currentGroup) return;

    const username = this.getMemberUsername(memberId);
    if (confirm(`确定要从群组中移除用户 ${username} 吗？`)) {
      const groupId = this.currentGroup.id || this.currentGroup._id!;
      console.log('Removing user from group:', { groupId, memberId });

      this.groupService.removeUserFromGroup(groupId, memberId).subscribe({
        next: (success) => {
          console.log('Remove user response:', success);
          if (success) {
            this.currentGroup!.memberIds = this.currentGroup!.memberIds.filter(id => id !== memberId);
            alert('用户已从群组中移除');
          } else {
            alert('移除用户失败');
          }
        },
        error: (error) => {
          console.error('Remove user error:', error);
          alert('移除用户时发生错误：' + (error.message || '未知错误'));
        }
      });
    }
  }

  promoteToGroupAdmin(memberId: string): void {
    if (!this.currentGroup) return;

    const username = this.getMemberUsername(memberId);
    if (confirm(`确定要提升用户 ${username} 为群组管理员吗？`)) {
      const groupId = this.currentGroup.id || this.currentGroup._id!;
      console.log('Promoting user to group admin:', { groupId, memberId });

      this.groupService.promoteUserToGroupAdmin(groupId, memberId).subscribe({
        next: (response) => {
          console.log('Promote user response:', response);
          if (response.success) {
            alert('用户已成功提升为群组管理员');
            // 重新加载群组数据以确保数据一致性
            this.loadGroup(groupId);
          } else {
            alert(response.message || '提升用户失败');
          }
        },
        error: (error) => {
          console.error('Promote user error:', error);
          alert('提升用户时发生错误：' + (error.error?.message || error.message || '未知错误'));
        }
      });
    }
  }

  demoteFromGroupAdmin(memberId: string): void {
    if (!this.currentGroup) return;

    const username = this.getMemberUsername(memberId);
    if (confirm(`确定要撤销用户 ${username} 的群组管理员权限吗？`)) {
      const groupId = this.currentGroup.id || this.currentGroup._id!;
      console.log('Demoting user from group admin:', { groupId, memberId });

      this.groupService.demoteUserFromGroupAdmin(groupId, memberId).subscribe({
        next: (response) => {
          console.log('Demote user response:', response);
          if (response.success) {
            alert('用户的群组管理员权限已被撤销');
            // 重新加载群组数据以确保数据一致性
            this.loadGroup(groupId);
          } else {
            alert(response.message || '撤销权限失败');
          }
        },
        error: (error) => {
          console.error('Demote user error:', error);
          alert('撤销权限时发生错误：' + (error.error?.message || error.message || '未知错误'));
        }
      });
    }
  }

  get usersNotInGroup(): User[] {
    if (!this.currentGroup || !this.allUsers) return [];

    console.log('Computing usersNotInGroup:', {
      allUsers: this.allUsers.map(u => ({ _id: u._id, id: u.id, username: u.username })),
      currentGroupMemberIds: this.currentGroup.memberIds,
      currentGroup: this.currentGroup
    });

    // 获取群组成员的ID列表（支持对象和字符串格式）
    const memberIds = (this.currentGroup.memberIds || []).map(member =>
      typeof member === 'string' ? member : (member._id || member.id)
    );

    console.log('Member IDs:', memberIds);

    // 过滤出不在群组中的用户（同时检查_id和id字段）
    const filtered = this.allUsers.filter(user => {
      const userId = user._id || user.id;
      const isInGroup = memberIds.includes(userId);
      console.log(`User ${user.username} (${userId}): in group = ${isInGroup}`);
      return !isInGroup;
    });

    console.log('Filtered users not in group:', filtered.map(u => ({ _id: u._id, id: u.id, username: u.username })));

    return filtered;
  }

  canManageGroup(): boolean {
    if (!this.currentGroup || !this.currentUser) return false;

    // 检查是否是超级管理员
    if (this.authService.isSuperAdmin()) return true;

    // 检查是否是群组管理员（考虑populate后的对象格式）
    return this.currentGroup.adminIds.some(admin => {
      const adminId = admin._id ? admin._id.toString() : admin.toString();
      return adminId === this.currentUser!.id.toString();
    });
  }

  canManageChannels(): boolean {
    return this.canManageGroup();
  }

  isGroupAdmin(userIdOrObject: string | any): boolean {
    if (!this.currentGroup) return false;

    // 获取用户ID（支持字符串ID或对象）
    const userId = typeof userIdOrObject === 'string' ? userIdOrObject : (userIdOrObject?._id || userIdOrObject?.id);

    return this.currentGroup.adminIds.includes(userId);
  }

  getMemberCount(): number {
    return this.currentGroup ? (this.currentGroup.memberIds?.length || 0) : 0;
  }

  getMemberUsername(userIdOrObject: string | any): string {
    console.log('getMemberUsername called with:', userIdOrObject, 'type:', typeof userIdOrObject);

    // 如果传入的是对象且有username属性，直接返回用户名
    if (typeof userIdOrObject === 'object' && userIdOrObject?.username) {
      console.log('Returning username from object:', userIdOrObject.username);
      return userIdOrObject.username;
    }

    // 如果传入的是字符串ID，查找用户
    const userId = typeof userIdOrObject === 'string' ? userIdOrObject : (userIdOrObject?._id || userIdOrObject?.id);
    console.log('Searching for userId:', userId);
    const user = this.allUsers.find(u => (u._id || u.id) === userId);
    const result = user ? user.username : 'Unknown User';
    console.log('Found user:', user, 'returning:', result);
    return result;
  }

  formatTime(timestamp: Date | undefined): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}