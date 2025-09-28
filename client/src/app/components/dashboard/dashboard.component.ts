import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GroupService } from '../../services/group.service';
import { User } from '../../models/user.model';
import { Group } from '../../models/group.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard-container">
      <header class="dashboard-header">
        <h1>聊天系统</h1>
        <div class="user-info">
          <span>欢迎, {{ currentUser?.username }}</span>
          <span class="role-badge" [ngClass]="getRoleClass()">
            {{ getRoleDisplay() }}
          </span>
          <button class="btn btn-secondary" (click)="logout()">退出</button>
        </div>
      </header>

      <div class="dashboard-content">
        <div class="groups-section">
          <h2>我的群组</h2>

          <div *ngIf="groups.length === 0" class="no-groups">
            <p>您还没有加入任何群组</p>
            <button *ngIf="canCreateGroup()" class="btn btn-primary" (click)="showCreateGroup = true">
              创建群组
            </button>
          </div>

          <div class="groups-list">
            <div *ngFor="let group of groups" class="group-card" (click)="enterGroup(group)">
              <h3>{{ group.name }}</h3>
              <p>{{ group.description }}</p>
              <div class="group-stats">
                <span>{{ group.memberIds.length }} 成员</span>
                <span>{{ group.channels.length }} 频道</span>
              </div>
              <div *ngIf="isGroupAdminOf(group)" class="admin-badge">管理员</div>
            </div>
          </div>

          <div class="action-buttons">
            <button *ngIf="canCreateGroup()" class="btn btn-primary" (click)="showCreateGroup = true">
              创建新群组
            </button>
          </div>
        </div>

        <!-- Super Admin Panel -->
        <div *ngIf="isSuperAdmin()" class="admin-section">
          <h2>管理面板</h2>

          <div class="admin-tabs">
            <button
              class="tab-btn"
              [class.active]="activeTab === 'users'"
              (click)="activeTab = 'users'">
              用户管理
            </button>
            <button
              class="tab-btn"
              [class.active]="activeTab === 'groups'"
              (click)="activeTab = 'groups'">
              群组管理
            </button>
          </div>

          <div *ngIf="activeTab === 'users'" class="tab-content">
            <h3>所有用户</h3>
            <div class="users-list">
              <div *ngFor="let user of allUsers" class="user-item">
                <span>{{ user.username }}</span>
                <span>{{ user.email }}</span>
                <span class="roles">{{ user.roles.join(', ') }}</span>
                <div class="user-actions">
                  <button
                    *ngIf="!user.roles.includes('group-admin')"
                    class="btn btn-small btn-primary"
                    (click)="promoteToGroupAdmin(user)">
                    提升为群组管理员
                  </button>
                  <button
                    *ngIf="user.id !== currentUser?.id"
                    class="btn btn-small btn-danger"
                    (click)="deleteUser(user)">
                    删除用户
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="activeTab === 'groups'" class="tab-content">
            <h3>所有群组</h3>
            <div class="groups-admin-list">
              <div *ngFor="let group of allGroups" class="group-admin-item">
                <h4>{{ group.name }}</h4>
                <p>{{ group.description }}</p>
                <div class="group-details">
                  <span>创建者ID: {{ group.createdBy }}</span>
                  <span>成员数: {{ group.memberIds.length }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Group Modal -->
      <div *ngIf="showCreateGroup" class="modal">
        <div class="modal-content">
          <h3>创建新群组</h3>
          <form (ngSubmit)="createGroup()">
            <div class="form-group">
              <label>群组名称:</label>
              <input
                type="text"
                [(ngModel)]="newGroupName"
                name="groupName"
                required
                placeholder="请输入群组名称">
            </div>
            <div class="form-group">
              <label>群组描述:</label>
              <textarea
                [(ngModel)]="newGroupDescription"
                name="groupDescription"
                placeholder="请输入群组描述（可选）">
              </textarea>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="cancelCreateGroup()">
                取消
              </button>
              <button type="submit" class="btn btn-primary">创建</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .dashboard-header {
      background: #2c3e50;
      color: white;
      padding: 15px 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .role-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
    }

    .role-badge.super-admin {
      background: #e74c3c;
      color: white;
    }

    .role-badge.group-admin {
      background: #f39c12;
      color: white;
    }

    .role-badge.user {
      background: #95a5a6;
      color: white;
    }

    .dashboard-content {
      flex: 1;
      padding: 30px;
      overflow-y: auto;
    }

    .groups-section, .admin-section {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .groups-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }

    .group-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 15px;
      cursor: pointer;
      transition: all 0.3s;
      position: relative;
    }

    .group-card:hover {
      border-color: #007bff;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }

    .group-card h3 {
      margin: 0 0 10px 0;
      color: #2c3e50;
    }

    .group-card p {
      color: #666;
      margin: 0 0 10px 0;
    }

    .group-stats {
      display: flex;
      gap: 15px;
      font-size: 12px;
      color: #999;
    }

    .admin-badge {
      position: absolute;
      top: 10px;
      right: 10px;
      background: #f39c12;
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 10px;
    }

    .no-groups {
      text-align: center;
      color: #666;
      margin: 40px 0;
    }

    .action-buttons {
      margin-top: 20px;
    }

    .admin-tabs {
      display: flex;
      margin-bottom: 20px;
      border-bottom: 1px solid #ddd;
    }

    .tab-btn {
      background: none;
      border: none;
      padding: 10px 20px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.3s;
    }

    .tab-btn.active {
      border-bottom-color: #007bff;
      color: #007bff;
    }

    .tab-content {
      margin-top: 20px;
    }

    .users-list, .groups-admin-list {
      margin-top: 15px;
    }

    .user-item, .group-admin-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      border-bottom: 1px solid #eee;
    }

    .user-item span, .group-details span {
      margin-right: 15px;
    }

    .user-actions {
      display: flex;
      gap: 10px;
    }

    .btn-small {
      padding: 5px 10px;
      font-size: 12px;
    }

    .modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      padding: 30px;
      border-radius: 8px;
      width: 90%;
      max-width: 500px;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }

    textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      resize: vertical;
      min-height: 80px;
    }
  `]
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  groups: Group[] = [];
  allUsers: User[] = [];
  allGroups: Group[] = [];
  activeTab = 'users';

  showCreateGroup = false;
  newGroupName = '';
  newGroupDescription = '';

  constructor(
    private authService: AuthService,
    private groupService: GroupService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadUserGroups();

    if (this.isSuperAdmin()) {
      this.loadAllUsers();
      this.loadAllGroups();
    }
  }

  loadUserGroups(): void {
    this.groupService.getUserGroups().subscribe({
      next: groups => {
        console.log('User groups loaded:', groups);
        console.log('First group structure:', groups[0]);
        if (groups[0]) {
          console.log('Group properties:', Object.keys(groups[0]));
          console.log('Group _id:', groups[0]._id);
          console.log('Group id:', groups[0].id);
        }
        this.groups = groups;
      },
      error: error => {
        console.error('Error loading user groups:', error);
      }
    });
  }

  loadAllUsers(): void {
    this.authService.getAllUsers().subscribe({
      next: users => {
        console.log('All users loaded:', users);
        this.allUsers = users;
      },
      error: error => {
        console.error('Error loading all users:', error);
      }
    });
  }

  loadAllGroups(): void {
    this.groupService.getAllGroups().subscribe({
      next: groups => {
        console.log('All groups loaded:', groups);
        this.allGroups = groups;
      },
      error: error => {
        console.error('Error loading all groups:', error);
      }
    });
  }

  getRoleClass(): string {
    if (this.isSuperAdmin()) return 'super-admin';
    if (this.isGroupAdmin()) return 'group-admin';
    return 'user';
  }

  getRoleDisplay(): string {
    if (this.isSuperAdmin()) return '超级管理员';
    if (this.isGroupAdmin()) return '群组管理员';
    return '普通用户';
  }

  isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  isGroupAdmin(): boolean {
    return this.authService.isGroupAdmin();
  }

  canCreateGroup(): boolean {
    return this.isGroupAdmin() || this.isSuperAdmin();
  }

  isGroupAdminOf(group: Group): boolean {
    if (!this.currentUser) return false;

    // adminIds 可能是字符串数组或对象数组
    return group.adminIds.some(adminId => {
      if (typeof adminId === 'string') {
        return adminId === this.currentUser!.id;
      } else if (typeof adminId === 'object' && adminId !== null) {
        return (adminId as any)._id === this.currentUser!.id || (adminId as any).id === this.currentUser!.id;
      }
      return false;
    });
  }

  enterGroup(group: Group): void {
    console.log('Group object:', group);

    // 使用实际的群组ID（支持MongoDB的_id和标准id字段）
    const groupId = group._id || group.id;
    console.log('Entering group with ID:', groupId);

    if (groupId) {
      this.router.navigate(['/chat', groupId]);
    } else {
      console.error('No valid group ID found:', group);
    }
  }

  createGroup(): void {
    if (!this.newGroupName.trim()) return;

    this.groupService.createGroup({
      name: this.newGroupName,
      description: this.newGroupDescription
    }).subscribe(group => {
      this.groups.push(group);
      this.cancelCreateGroup();
    });
  }

  cancelCreateGroup(): void {
    this.showCreateGroup = false;
    this.newGroupName = '';
    this.newGroupDescription = '';
  }

  promoteToGroupAdmin(user: User): void {
    if (confirm(`确定要将用户 ${user.username} 提升为群组管理员吗？`)) {
      const newRoles = [...user.roles];
      if (!newRoles.includes('group-admin')) {
        newRoles.push('group-admin');
      }

      const userId = user._id || user.id;
      if (!userId) {
        alert('用户ID无效');
        return;
      }
      this.authService.updateUserRoles(userId, newRoles).subscribe({
        next: () => {
          this.loadAllUsers();
          alert('用户权限已更新');
        },
        error: (error) => {
          console.error('更新用户权限失败:', error);
          alert('更新用户权限失败');
        }
      });
    }
  }

  deleteUser(user: User): void {
    if (confirm(`确定要删除用户 ${user.username} 吗？此操作不可恢复。`)) {
      const userId = user._id || user.id;
      if (!userId) {
        alert('用户ID无效');
        return;
      }
      this.authService.deleteUser(userId).subscribe({
        next: () => {
          this.loadAllUsers();
          alert('用户已删除');
        },
        error: (error) => {
          console.error('删除用户失败:', error);
          alert('删除用户失败');
        }
      });
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}