import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfileService, UserProfile } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="profile-container">
      <div class="profile-header">
        <h2>个人资料</h2>
        <button class="btn-secondary" (click)="goBack()">返回</button>
      </div>

      <div class="profile-content">
        <!-- Avatar Section -->
        <div class="avatar-section">
          <div class="avatar-container">
            <img
              [src]="getAvatarUrl(profile?.avatar)"
              [alt]="profile?.username"
              class="profile-avatar"
              (error)="onAvatarError($event)"
            />
            <div class="avatar-overlay" (click)="triggerFileInput()">
              <span>更换头像</span>
            </div>
          </div>

          <input
            #fileInput
            type="file"
            accept="image/*"
            (change)="onAvatarSelected($event)"
            style="display: none"
          />

          <div class="avatar-actions">
            <button class="btn-primary" (click)="triggerFileInput()">
              上传头像
            </button>
            <button
              class="btn-danger"
              (click)="removeAvatar()"
              *ngIf="profile?.avatar"
            >
              删除头像
            </button>
          </div>
        </div>

        <!-- Profile Form -->
        <div class="profile-form">
          <form (ngSubmit)="updateProfile()" #profileForm="ngForm">
            <div class="form-group">
              <label for="username">用户名</label>
              <input
                id="username"
                type="text"
                [(ngModel)]="formData.username"
                name="username"
                class="form-control"
                required
                minlength="3"
                maxlength="30"
              />
            </div>

            <div class="form-group">
              <label for="email">邮箱</label>
              <input
                id="email"
                type="email"
                [(ngModel)]="formData.email"
                name="email"
                class="form-control"
                required
              />
            </div>

            <div class="form-group">
              <label>角色</label>
              <div class="roles-display">
                <span
                  *ngFor="let role of profile?.roles"
                  class="role-badge"
                  [class.super-admin]="role === 'super-admin'"
                  [class.group-admin]="role === 'group-admin'"
                  [class.user]="role === 'user'"
                >
                  {{ getRoleDisplayName(role) }}
                </span>
              </div>
            </div>

            <div class="form-actions">
              <button
                type="submit"
                class="btn-primary"
                [disabled]="!profileForm.valid || isLoading"
              >
                {{ isLoading ? '保存中...' : '保存更改' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Loading Overlay -->
      <div class="loading-overlay" *ngIf="isLoading">
        <div class="spinner"></div>
        <p>{{ loadingMessage }}</p>
      </div>
    </div>
  `,
  styles: [`
    .profile-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      position: relative;
    }

    .profile-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 2px solid #e1e5e9;
    }

    .profile-header h2 {
      margin: 0;
      color: #2c3e50;
      font-size: 28px;
    }

    .profile-content {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 40px;
    }

    .avatar-section {
      text-align: center;
    }

    .avatar-container {
      position: relative;
      display: inline-block;
      margin-bottom: 20px;
    }

    .profile-avatar {
      width: 150px;
      height: 150px;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid #e1e5e9;
      transition: all 0.3s ease;
    }

    .avatar-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
      cursor: pointer;
    }

    .avatar-container:hover .avatar-overlay {
      opacity: 1;
    }

    .avatar-overlay span {
      color: white;
      font-size: 14px;
      font-weight: 500;
    }

    .avatar-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: center;
    }

    .profile-form {
      background: #f8f9fa;
      padding: 30px;
      border-radius: 8px;
      border: 1px solid #e1e5e9;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #495057;
    }

    .form-control {
      width: 100%;
      padding: 12px 15px;
      border: 2px solid #e1e5e9;
      border-radius: 6px;
      font-size: 16px;
      transition: border-color 0.3s ease;
    }

    .form-control:focus {
      outline: none;
      border-color: #007bff;
    }

    .roles-display {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .role-badge {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .role-badge.super-admin {
      background: #dc3545;
      color: white;
    }

    .role-badge.group-admin {
      background: #ffc107;
      color: #212529;
    }

    .role-badge.user {
      background: #28a745;
      color: white;
    }

    .form-actions {
      text-align: right;
      margin-top: 30px;
    }

    .btn-primary, .btn-secondary, .btn-danger {
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      display: inline-block;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0056b3;
    }

    .btn-primary:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #545b62;
    }

    .btn-danger {
      background: #dc3545;
      color: white;
      font-size: 14px;
      padding: 8px 16px;
    }

    .btn-danger:hover {
      background: #c82333;
    }

    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e1e5e9;
      border-top: 4px solid #007bff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .profile-content {
        grid-template-columns: 1fr;
        gap: 20px;
      }

      .profile-header {
        flex-direction: column;
        gap: 15px;
        text-align: center;
      }
    }
  `]
})
export class ProfileComponent implements OnInit {
  profile: UserProfile | null = null;
  formData: { username: string; email: string } = { username: '', email: '' };
  isLoading = false;
  loadingMessage = '';

  constructor(
    private profileService: ProfileService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.loadingMessage = '加载用户资料...';

    this.profileService.getMyProfile().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.formData = {
          username: profile.username,
          email: profile.email
        };
        this.isLoading = false;
      },
      error: (error) => {
        console.error('加载用户资料失败:', error);
        alert('加载用户资料失败: ' + (error.error?.message || error.message));
        this.isLoading = false;
      }
    });
  }

  updateProfile(): void {
    if (!this.formData.username.trim() || !this.formData.email.trim()) {
      alert('请填写所有必填字段');
      return;
    }

    this.isLoading = true;
    this.loadingMessage = '保存更改...';

    this.profileService.updateProfile(this.formData).subscribe({
      next: (updatedProfile) => {
        this.profile = updatedProfile;
        // Update auth service with new user data
        this.authService.updateCurrentUser(updatedProfile);
        alert('个人资料更新成功');
        this.isLoading = false;
      },
      error: (error) => {
        console.error('更新个人资料失败:', error);
        alert('更新失败: ' + (error.error?.message || error.message));
        this.isLoading = false;
      }
    });
  }

  triggerFileInput(): void {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fileInput?.click();
  }

  onAvatarSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('文件大小不能超过5MB');
      return;
    }

    this.isLoading = true;
    this.loadingMessage = '上传头像...';

    this.profileService.uploadAvatar(file).subscribe({
      next: (response) => {
        this.profile = response.user;
        this.authService.updateCurrentUser(response.user);
        alert('头像上传成功');
        this.isLoading = false;

        // Clear file input
        event.target.value = '';
      },
      error: (error) => {
        console.error('上传头像失败:', error);
        alert('上传失败: ' + (error.error?.message || error.message));
        this.isLoading = false;

        // Clear file input
        event.target.value = '';
      }
    });
  }

  removeAvatar(): void {
    if (!confirm('确定要删除头像吗？')) return;

    this.isLoading = true;
    this.loadingMessage = '删除头像...';

    this.profileService.deleteAvatar().subscribe({
      next: (response) => {
        this.profile = response.user;
        this.authService.updateCurrentUser(response.user);
        alert('头像删除成功');
        this.isLoading = false;
      },
      error: (error) => {
        console.error('删除头像失败:', error);
        alert('删除失败: ' + (error.error?.message || error.message));
        this.isLoading = false;
      }
    });
  }

  getAvatarUrl(avatar: string | null | undefined): string {
    return this.profileService.getAvatarUrl(avatar);
  }

  onAvatarError(event: any): void {
    event.target.src = '/assets/default-avatar.png';
  }

  getRoleDisplayName(role: string): string {
    switch (role) {
      case 'super-admin': return '超级管理员';
      case 'group-admin': return '群组管理员';
      case 'user': return '用户';
      default: return role;
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}