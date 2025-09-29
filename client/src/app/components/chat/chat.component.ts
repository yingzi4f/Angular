import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { GroupService } from '../../services/group.service';
import { SocketService } from '../../services/socket.service';
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
              [class.active]="currentChannel?.id === channel.id">
              <span (click)="selectChannel(channel)" class="channel-name">
                # {{ channel.name }}
              </span>
              <button
                *ngIf="canManageChannels() && channel.name !== 'general'"
                class="btn btn-danger btn-small channel-delete"
                (click)="deleteChannel(channel)"
                title="删除频道">
                ×
              </button>
            </div>
          </div>
        </div>

        <div class="members-section">
          <h4>成员 ({{ getMemberCount() }})</h4>
          <div class="members-list">
             <div *ngFor="let member of currentGroup?.memberIds" class="member-item">
               {{ getMemberUsername(member) }}
               <span *ngIf="isGroupAdmin(member)" class="admin-label">管理员</span>
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
            <div class="message-avatar">
              <img [src]="getAvatarUrl(message.senderId)"
                   [alt]="message.senderUsername"
                   class="avatar-small"
                   (error)="onAvatarError($event)">
            </div>
            <div class="message-content-wrapper">
              <div class="message-header">
                <strong>{{ message.senderUsername }}</strong>
                <span class="message-time">{{ formatTime(message.timestamp) }}</span>
              </div>
              <div class="message-content">
                <div *ngIf="message.type === 'text'">{{ message.content }}</div>
                <div *ngIf="message.type === 'image'" class="image-message">
                  <img [src]="'http://localhost:3000' + message.fileUrl"
                       [alt]="'图片消息'"
                       class="chat-image"
                       (error)="onImageError($event)"
                       (click)="openImagePreview('http://localhost:3000' + message.fileUrl)">
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="chat-input" *ngIf="currentGroup">
          <div class="attachment-preview" *ngIf="selectedImage">
            <div class="preview-container">
              <span class="preview-filename">{{ selectedImage.name }}</span>
              <button class="btn-remove-preview" (click)="removeImagePreview()">×</button>
            </div>
          </div>

          <form (ngSubmit)="sendMessage()" class="message-form">
            <div class="input-container">
              <input
                type="text"
                [(ngModel)]="newMessage"
                name="newMessage"
                placeholder="输入消息..."
                class="message-input"
                [disabled]="isUploading">
              <input
                #fileInput
                type="file"
                accept="image/*"
                (change)="onImageSelected($event)"
                style="display: none">
              <button type="button" class="btn-attachment" title="发送图片" (click)="triggerFileInput()" [disabled]="isUploading">
                📎
              </button>
            </div>
            <button type="submit" class="btn btn-primary" [disabled]="isUploading">
              {{ isUploading ? '上传中...' : '发送' }}
            </button>
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
                 <span>{{ getMemberUsername(member) }}</span>
                 <span *ngIf="isGroupAdmin(member)" class="admin-label group-admin">群组管理员</span>
               </div>
               <div class="member-actions">
                 <!-- Super Admin can promote/demote group admins -->
                 <button
                   *ngIf="authService.isSuperAdmin() && getMemberId(member) !== currentUser?.id && !isGroupAdmin(member)"
                   class="btn btn-success btn-small"
                   (click)="promoteToGroupAdmin(getMemberId(member))">
                   提升为管理员
                 </button>
                 <button
                   *ngIf="authService.isSuperAdmin() && getMemberId(member) !== currentUser?.id && isGroupAdmin(member)"
                   class="btn btn-warning btn-small"
                   (click)="demoteFromGroupAdmin(getMemberId(member))">
                   撤销管理员
                 </button>
                 <!-- Regular remove member button -->
                 <button
                   *ngIf="getMemberId(member) !== currentUser?.id && !isGroupAdmin(member)"
                   class="btn btn-danger btn-small"
                   (click)="removeMember(getMemberId(member))">
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
      border-radius: 4px;
      margin-bottom: 4px;
      transition: background-color 0.2s;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .channel-item:hover {
      background-color: #34495e;
    }

    .channel-item.active {
      background-color: #3498db;
    }

    .channel-name {
      cursor: pointer;
      flex: 1;
    }

    .channel-delete {
      background: transparent;
      border: 1px solid #e74c3c;
      color: #e74c3c;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      line-height: 1;
      margin-left: 5px;
      opacity: 0.7;
      padding: 0;
    }

    .channel-delete:hover {
      background: #e74c3c;
      color: white;
      opacity: 1;
    }

    .channel-item.active .channel-delete {
      border-color: rgba(255, 255, 255, 0.7);
      color: rgba(255, 255, 255, 0.7);
    }

    .channel-item.active .channel-delete:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: white;
      color: white;
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
      color: white;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: bold;
      margin-left: 8px;
    }

    .admin-label.group-admin {
      background-color: #e74c3c;
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
      display: flex;
      background-color: white;
      margin-bottom: 15px;
      padding: 12px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .message-avatar {
      margin-right: 12px;
    }

    .avatar-small {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #e1e5e9;
    }

    .message-content-wrapper {
      flex: 1;
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

    .image-message {
      margin-top: 8px;
    }

    .chat-image {
      max-width: 300px;
      max-height: 300px;
      border-radius: 8px;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .chat-image:hover {
      transform: scale(1.05);
    }

    .chat-input {
      padding: 20px;
      border-top: 1px solid #ecf0f1;
      background-color: white;
    }

    .attachment-preview {
      margin-bottom: 10px;
      padding: 8px;
      background-color: #f8f9fa;
      border-radius: 4px;
      border: 1px dashed #dee2e6;
    }

    .preview-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .preview-filename {
      font-size: 14px;
      color: #495057;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 200px;
    }

    .btn-remove-preview {
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-remove-preview:hover {
      background: #c82333;
    }

    .message-form {
      display: flex;
      gap: 10px;
    }

    .input-container {
      flex: 1;
      display: flex;
      align-items: center;
      border: 1px solid #ddd;
      border-radius: 25px;
      padding: 0 12px;
    }

    .message-input {
      flex: 1;
      padding: 12px 0;
      border: none;
      border-radius: 25px;
      font-size: 14px;
      outline: none;
    }

    .message-input:disabled {
      background-color: #f8f9fa;
    }

    .btn-attachment {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      font-size: 18px;
      cursor: pointer;
      padding: 8px;
      color: #6c757d;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .btn-attachment:hover:not(:disabled) {
      background-color: #007bff;
      border-color: #007bff;
      color: white;
      transform: scale(1.1);
    }

    .btn-attachment:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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

  // 图片上传相关属性
  selectedImage: File | null = null;
  isUploading = false;
  @ViewChild('fileInput') fileInput!: ElementRef;

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
    private groupService: GroupService,
    private socketService: SocketService
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

    // 初始化Socket连接
    this.socketService.connect();
    this.setupSocketListeners();

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
    // 断开Socket连接
    this.socketService.disconnect();
  }

  setupSocketListeners(): void {
    // 监听新消息
    this.socketService.onMessageReceived((message: Message) => {
      console.log('收到新消息:', message);

      // 只有当消息属于当前频道时才添加到消息列表
      if (this.currentChannel && message.channelId === (this.currentChannel.id || this.currentChannel._id)) {
        this.messages.push(message);
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });

    // 监听错误
    this.socketService.onError((error: any) => {
      console.error('Socket错误:', error);
      alert('连接错误: ' + error.message);
    });
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
    // 如果已经在一个频道中，先离开该频道
    if (this.currentChannel) {
      const currentChannelId = this.currentChannel.id || this.currentChannel._id;
      if (currentChannelId) {
        this.socketService.leaveChannel(currentChannelId);
      }
    }

    this.currentChannel = channel;

    // 加入新频道
    const newChannelId = channel.id || channel._id;
    if (newChannelId) {
      this.socketService.joinChannel(newChannelId);
    }

    this.loadMessages();
  }

  loadMessages(): void {
    if (this.currentChannel && this.currentGroup && (this.currentGroup.id || this.currentGroup._id) && (this.currentChannel.id || this.currentChannel._id)) {
      const groupId = this.currentGroup.id || this.currentGroup._id!;
      const channelId = this.currentChannel.id || this.currentChannel._id!;
      this.groupService.getChannelMessages(groupId, channelId).subscribe(messages => {
        this.messages = messages;
        // 加载消息后滚动到底部
        setTimeout(() => this.scrollToBottom(), 100);
      });
    }
  }

  sendMessage(): void {
    console.log('sendMessage called');
    console.log('newMessage:', this.newMessage);
    console.log('currentChannel:', this.currentChannel);
    console.log('currentGroup:', this.currentGroup);

    // 如果有选中的图片，发送图片消息
    if (this.selectedImage) {
      this.sendImageMessage();
      return;
    }

    // 如果没有文本消息且没有图片，直接返回
    if (!this.newMessage.trim()) {
      console.log('Empty message, returning');
      return;
    }

    if (!this.currentGroup || !this.currentChannel) {
      console.log('No current group or channel, returning');
      return;
    }

    const groupId = this.currentGroup.id || this.currentGroup._id!;
    const channelId = this.currentChannel.id || this.currentChannel._id!;

    if (!channelId) {
      console.log('No valid channel ID, returning');
      return;
    }

    // 使用Socket.IO发送消息
    this.socketService.sendMessage(channelId, this.newMessage, 'text');

    // 清空输入框
    this.newMessage = '';
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

  deleteChannel(channel: Channel): void {
    if (!this.currentGroup || !channel) return;

    if (channel.name === 'general') {
      alert('无法删除默认频道');
      return;
    }

    if (confirm(`确定要删除频道 "#${channel.name}" 吗？此操作无法撤销，频道内的所有消息也将被删除。`)) {
      const groupId = this.currentGroup.id || this.currentGroup._id!;
      const channelId = channel.id || channel._id!;

      this.groupService.deleteChannel(groupId, channelId).subscribe({
        next: (response) => {
          if (response.success) {
            // 从本地群组数据中移除已删除的频道
            if (this.currentGroup!.channels) {
              this.currentGroup!.channels = this.currentGroup!.channels.filter(c =>
                (c.id || c._id) !== channelId
              );
            }

            // 如果删除的是当前频道，切换到第一个可用频道
            if (this.currentChannel && (this.currentChannel.id || this.currentChannel._id) === channelId) {
              this.currentChannel = null;
              this.messages = [];
              if (this.currentGroup!.channels && this.currentGroup!.channels.length > 0) {
                this.selectChannel(this.currentGroup!.channels[0]);
              }
            }

            alert('频道已成功删除');
          } else {
            alert(response.message || '删除频道失败');
          }
        },
        error: (error) => {
          console.error('删除频道错误:', error);
          alert('删除频道时发生错误：' + (error.error?.message || error.message || '未知错误'));
        }
      });
    }
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
    if (!this.currentGroup || !this.currentUser || !this.currentUser.id) return false;

    // 检查是否是超级管理员
    if (this.authService.isSuperAdmin()) return true;

    // 检查是否是群组管理员（考虑populate后的对象格式）
    return this.currentGroup.adminIds.some(admin => {
      // 处理各种可能的ID格式
      const adminId = admin && typeof admin === 'object' ?
        (admin._id ? admin._id.toString() : (admin.id ? admin.id.toString() : '')) :
        admin.toString();
      return adminId === this.currentUser!.id!.toString();
    });
  }

  canManageChannels(): boolean {
    return this.canManageGroup();
  }

  isGroupAdmin(userIdOrObject: string | any): boolean {
    if (!this.currentGroup) return false;

    // 获取用户ID（支持字符串ID或对象）
    const userId = typeof userIdOrObject === 'string' ? userIdOrObject : (userIdOrObject?._id || userIdOrObject?.id);
    if (!userId) return false;

    console.log('Checking isGroupAdmin for user:', userId);
    console.log('Current group adminIds:', this.currentGroup.adminIds);

    // 检查是否是群组管理员（考虑populate后的对象格式）
    const isAdmin = this.currentGroup.adminIds.some(admin => {
      // 处理各种可能的ID格式
      const adminId = admin && typeof admin === 'object' ?
        (admin._id ? admin._id.toString() : (admin.id ? admin.id.toString() : '')) :
        admin.toString();
      console.log('Comparing adminId:', adminId, 'with userId:', userId.toString());
      return adminId === userId.toString();
    });

    console.log('isGroupAdmin result:', isAdmin);
    return isAdmin;
  }

  getMemberCount(): number {
    return this.currentGroup ? (this.currentGroup.memberIds?.length || 0) : 0;
  }

  getMemberId(member: any): string {
    if (typeof member === 'string') {
      return member;
    }
    return member?._id || member?.id || '';
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

  // 图片处理方法
  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onImageSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    // 验证文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('文件大小不能超过5MB');
      return;
    }

    this.selectedImage = file;
  }

  removeImagePreview(): void {
    this.selectedImage = null;
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  sendImageMessage(): void {
    if (!this.selectedImage || !this.currentGroup || !this.currentChannel) return;

    this.isUploading = true;

    // 上传图片
    this.groupService.uploadImage(this.selectedImage).subscribe({
      next: (result) => {
        console.log('Upload result:', result);
        // 发送图片消息
        const channelId = this.currentChannel!.id || this.currentChannel!._id!;

        console.log('Sending image message with:', {
          fileUrl: result.fileUrl,
          fileSize: result.fileSize,
          mimeType: result.mimeType
        });

        // 使用Socket.IO发送图片消息
        this.socketService.sendMessage(
          channelId,
          '', // 图片消息内容为空
          'image',
          result.fileUrl,
          result.fileSize,
          result.mimeType
        );

        // 清空图片预览
        this.removeImagePreview();
        this.isUploading = false;
      },
      error: (error) => {
        console.error('上传图片失败:', error);
        alert('上传图片失败: ' + (error.error?.message || error.message));
        this.isUploading = false;
      }
    });
  }

  onImageError(event: any): void {
    event.target.src = 'assets/default-image.png';
  }

  openImagePreview(imageUrl: string): void {
    // 在实际应用中，可以打开一个模态框显示大图
    window.open(imageUrl, '_blank');
  }

  scrollToBottom(): void {
    try {
      const messagesContainer = document.querySelector('.chat-messages');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    } catch(err) {
      console.log('Scroll to bottom error:', err);
    }
  }

  // 头像相关方法
  getAvatarUrl(userId: string): string {
    // 在实际应用中，你可能需要从用户数据中获取头像URL
    // 这里我们检查是否有用户数据包含头像信息
    // 如果有用户数据，可以在这里查找对应的头像
    // 目前返回默认头像
    return '/assets/default-avatar.png';
  }

  onAvatarError(event: any): void {
    event.target.src = '/assets/default-avatar.png';
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}