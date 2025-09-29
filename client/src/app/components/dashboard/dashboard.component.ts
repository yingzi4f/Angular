import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GroupService } from '../../services/group.service';
import { ProfileService } from '../../services/profile.service';
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
          <div class="user-profile" (click)="goToProfile()">
            <img
              [src]="getAvatarUrl(currentUser?.avatar)"
              [alt]="currentUser?.username"
              class="user-avatar"
              (error)="onAvatarError($event)"
            />
            <div class="user-details">
              <span class="username">{{ currentUser?.username }}</span>
              <span class="role-badge" [ngClass]="getRoleClass()">
                {{ getRoleDisplay() }}
              </span>
            </div>
          </div>
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
            <div *ngFor="let group of groups" class="group-card">
              <div class="group-content" (click)="enterGroup(group)">
                <h3>{{ group.name }}</h3>
                <p>{{ group.description }}</p>
                <div class="group-stats">
                  <span>{{ (group.memberIds.length || 0) }} 成员</span>
                  <span>{{ (group.channels.length || 0) }} 频道</span>
                </div>
                <div *ngIf="isGroupAdminOf(group)" class="admin-badge">管理员</div>
              </div>
              <button
                *ngIf="canDeleteGroup(group)"
                class="btn btn-danger btn-small group-delete"
                (click)="deleteGroup(group, $event)"
                title="删除群组">
                删除
              </button>
            </div>
          </div>

          <div class="action-buttons">
            <button *ngIf="canCreateGroup()" class="btn btn-primary" (click)="showCreateGroup = true">
              创建新群组
            </button>
          </div>
        </div>

        <!-- Available Groups Section for regular users -->
        <div class="available-groups-section">
          <h2>可申请加入的群组</h2>

          <div *ngIf="availableGroups.length === 0" class="no-groups">
            <p>暂无可申请加入的群组</p>
          </div>

          <div class="groups-list">
            <div *ngFor="let group of availableGroups" class="group-card available-group">
              <h3>{{ group.name }}</h3>
              <p>{{ group.description }}</p>
              <div class="group-stats">
                <span>{{ (group.memberIds.length || 0) }} 成员</span>
                <span>{{ (group.channels.length || 0) }} 频道</span>
              </div>
              <button class="btn btn-primary btn-small" (click)="applyToGroup(group)">
                申请加入
              </button>
            </div>
          </div>
        </div>

        <!-- Applications Management for Admins -->
        <div *ngIf="canManageGroups() && pendingApplications.length > 0" class="applications-section">
          <h2>待审核申请</h2>
          <div class="applications-list">
            <div *ngFor="let application of pendingApplications" class="application-item">
              <div class="application-info">
                <h4>{{ application.username }}</h4>
                <p>申请加入：{{ application.groupName }}</p>
                <p *ngIf="application.message">申请理由：{{ application.message }}</p>
                <small>申请时间：{{ application.appliedAt | date:'short' }}</small>
              </div>
              <div class="application-actions">
                <button class="btn btn-success btn-small" (click)="reviewApplication(application, 'approve')">
                  批准
                </button>
                <button class="btn btn-danger btn-small" (click)="reviewApplication(application, 'reject')">
                  拒绝
                </button>
              </div>
            </div>
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
            <button
              class="tab-btn"
              [class.active]="activeTab === 'create-user'"
              (click)="activeTab = 'create-user'">
              创建用户
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
                  <span>成员数: {{ group.memberIds.length || 0 }}</span>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="activeTab === 'create-user'" class="tab-content">
            <h3>创建新用户</h3>
            <form (ngSubmit)="createUser()" class="create-user-form">
              <div class="form-group">
                <label for="username">用户名</label>
                <input
                  id="username"
                  type="text"
                  [(ngModel)]="newUserUsername"
                  name="username"
                  placeholder="请输入用户名"
                  required>
              </div>
              <div class="form-group">
                <label for="email">邮箱</label>
                <input
                  id="email"
                  type="email"
                  [(ngModel)]="newUserEmail"
                  name="email"
                  placeholder="请输入邮箱"
                  required>
              </div>
              <div class="form-group">
                <label for="password">密码</label>
                <input
                  id="password"
                  type="password"
                  [(ngModel)]="newUserPassword"
                  name="password"
                  placeholder="请输入密码"
                  required>
              </div>
              <button type="submit" class="btn btn-primary">创建用户</button>
            </form>
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

      <!-- Apply to Group Modal -->
      <div *ngIf="showApplyGroup" class="modal">
        <div class="modal-content">
          <h3>申请加入群组：{{ selectedGroup?.name }}</h3>
          <form (ngSubmit)="submitApplication()">
            <div class="form-group">
              <label>申请理由（可选）:</label>
              <textarea
                [(ngModel)]="applicationMessage"
                name="applicationMessage"
                placeholder="请简述您想加入此群组的原因..."
                rows="4">
              </textarea>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="showApplyGroup = false; selectedGroup = null; applicationMessage = ''">
                取消
              </button>
              <button type="submit" class="btn btn-primary">提交申请</button>
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

    .user-profile {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #fff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
      transition: all 0.3s;
      position: relative;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .group-content {
      cursor: pointer;
      flex: 1;
    }

    .group-delete {
      margin-left: 10px;
      margin-top: 15px;
      padding: 5px 10px;
      font-size: 12px;
      opacity: 0.8;
      align-self: flex-end;
    }

    .group-delete:hover {
      opacity: 1;
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

    .available-groups-section {
      margin-top: 30px;
    }

    .available-group {
      position: relative;
    }

    .available-group .btn {
      position: absolute;
      bottom: 15px;
      right: 15px;
    }

    .applications-section {
      margin-top: 30px;
    }

    .applications-list {
      margin-top: 15px;
    }

    .application-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 8px;
      margin-bottom: 10px;
      background: white;
    }

    .application-info h4 {
      margin: 0 0 5px 0;
      color: #333;
    }

    .application-info p {
      margin: 2px 0;
      color: #666;
    }

    .application-info small {
      color: #999;
    }

    .application-actions {
      display: flex;
      gap: 10px;
    }

    .create-user-form {
      max-width: 400px;
    }

    .create-user-form .form-group {
      margin-bottom: 20px;
    }

    .btn-success {
      background-color: #28a745;
      border-color: #28a745;
      color: white;
    }

    .btn-success:hover {
      background-color: #218838;
      border-color: #1e7e34;
    }

    .btn-danger {
      background-color: #dc3545;
      border-color: #dc3545;
      color: white;
    }

    .btn-danger:hover {
      background-color: #c82333;
      border-color: #bd2130;
    }
  `]
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  groups: Group[] = [];
  allUsers: User[] = [];
  allGroups: Group[] = [];
  availableGroups: Group[] = [];
  pendingApplications: any[] = [];
  activeTab = 'users';

  showCreateGroup = false;
  newGroupName = '';
  newGroupDescription = '';

  showCreateUser = false;
  newUserUsername = '';
  newUserEmail = '';
  newUserPassword = '';

  showApplyGroup = false;
  selectedGroup: Group | null = null;
  applicationMessage = '';

  showApplications = false;

  constructor(
    private authService: AuthService,
    private groupService: GroupService,
    private profileService: ProfileService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadUserGroups();
    this.loadAvailableGroups();

    if (this.isSuperAdmin()) {
      this.loadAllUsers();
      this.loadAllGroups();
    }

    if (this.canManageGroups()) {
      this.loadPendingApplications();
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

  // 加载可申请的群组
  loadAvailableGroups(): void {
    this.groupService.getAvailableGroups().subscribe({
      next: groups => {
        this.availableGroups = groups;
        console.log('Available groups loaded:', groups);
      },
      error: error => {
        console.error('Error loading available groups:', error);
      }
    });
  }

  // 加载待审核申请
  loadPendingApplications(): void {
    this.groupService.getPendingApplications().subscribe({
      next: applications => {
        this.pendingApplications = applications;
        console.log('Pending applications loaded:', applications);
      },
      error: error => {
        console.error('Error loading pending applications:', error);
      }
    });
  }

  // 申请加入群组
  applyToGroup(group: Group): void {
    this.selectedGroup = group;
    this.showApplyGroup = true;
  }

  // 提交申请
  submitApplication(): void {
    if (!this.selectedGroup) return;

    const groupId = this.selectedGroup._id || this.selectedGroup.id!;
    this.groupService.applyToGroup(groupId, this.applicationMessage).subscribe({
      next: success => {
        if (success) {
          alert('申请已提交，等待管理员审核');
          this.showApplyGroup = false;
          this.applicationMessage = '';
          this.selectedGroup = null;
          this.loadAvailableGroups();
        } else {
          alert('申请提交失败');
        }
      },
      error: error => {
        console.error('Apply to group error:', error);
        alert('申请提交时发生错误');
      }
    });
  }

  // 审核申请
  reviewApplication(application: any, action: 'approve' | 'reject'): void {
    const message = action === 'reject' ? prompt('请输入拒绝原因（可选）:') || '' : '';

    this.groupService.reviewApplication(application._id || application.id, action, message).subscribe({
      next: success => {
        if (success) {
          alert(action === 'approve' ? '申请已批准' : '申请已拒绝');
          this.loadPendingApplications();
          this.loadUserGroups();
        } else {
          alert('操作失败');
        }
      },
      error: error => {
        console.error('Review application error:', error);
        alert('操作时发生错误');
      }
    });
  }

  // 创建用户
  createUser(): void {
    if (!this.newUserUsername || !this.newUserEmail || !this.newUserPassword) {
      alert('请填写所有必填字段');
      return;
    }

    const userData = {
      username: this.newUserUsername,
      email: this.newUserEmail,
      password: this.newUserPassword,
      roles: ['user']
    };

    this.groupService.createUser(userData).subscribe({
      next: user => {
        alert('用户创建成功');
        this.showCreateUser = false;
        this.newUserUsername = '';
        this.newUserEmail = '';
        this.newUserPassword = '';
        this.loadAllUsers();
      },
      error: error => {
        console.error('Create user error:', error);
        alert('创建用户失败：' + (error.error?.message || '未知错误'));
      }
    });
  }

  // 权限检查方法
  canManageGroups(): boolean {
    return this.currentUser?.roles.includes('group-admin') || this.isSuperAdmin();
  }

  canCreateUsers(): boolean {
    return this.isSuperAdmin();
  }

  canDeleteGroup(group: Group): boolean {
    if (!this.currentUser) return false;

    // 超级管理员可以删除所有群组
    if (this.isSuperAdmin()) return true;

    // 群组创建者可以删除自己创建的群组
    const createdById = group.createdBy?._id || group.createdBy?.id || group.createdBy;
    return createdById === this.currentUser.id;
  }

  deleteGroup(group: Group, event: Event): void {
    event.stopPropagation(); // 阻止卡片点击事件

    if (!group) return;

    const confirmMessage = `确定要删除群组 "${group.name}" 吗？此操作将删除群组内的所有频道和消息，且无法恢复。`;

    if (confirm(confirmMessage)) {
      const groupId = group._id || group.id!;

      this.groupService.deleteGroup(groupId).subscribe({
        next: (response) => {
          if (response.success) {
            alert('群组已成功删除');

            // 从本地列表中移除已删除的群组
            this.groups = this.groups.filter(g => (g._id || g.id) !== groupId);
            this.allGroups = this.allGroups.filter(g => (g._id || g.id) !== groupId);

            // 重新加载相关数据
            this.loadUserGroups();
            this.loadAvailableGroups();

            if (this.isSuperAdmin()) {
              this.loadAllGroups();
            }
          } else {
            alert(response.message || '删除群组失败');
          }
        },
        error: (error) => {
          console.error('删除群组错误:', error);
          alert('删除群组时发生错误：' + (error.error?.message || error.message || '未知错误'));
        }
      });
    }
  }

  getAvatarUrl(avatar: string | null | undefined): string {
    return this.profileService.getAvatarUrl(avatar);
  }

  onAvatarError(event: any): void {
    event.target.src = '/assets/default-avatar.svg';
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}