import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginRequest } from '../../models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-form">
        <h2>聊天系统登录</h2>

        <form (ngSubmit)="onLogin()" #loginForm="ngForm">
          <div class="form-group">
            <label for="username">用户名:</label>
            <input
              type="text"
              id="username"
              name="username"
              [(ngModel)]="credentials.username"
              required
              #username="ngModel"
              placeholder="请输入用户名">
            <div *ngIf="username.invalid && username.touched" class="error">
              用户名不能为空
            </div>
          </div>

          <div class="form-group">
            <label for="password">密码:</label>
            <input
              type="password"
              id="password"
              name="password"
              [(ngModel)]="credentials.password"
              required
              #password="ngModel"
              placeholder="请输入密码">
            <div *ngIf="password.invalid && password.touched" class="error">
              密码不能为空
            </div>
          </div>

          <div *ngIf="errorMessage" class="error">
            {{ errorMessage }}
          </div>

          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="!loginForm.form.valid || isLoading">
            {{ isLoading ? '登录中...' : '登录' }}
          </button>
        </form>

        <div class="login-help">
          <p>默认超级管理员账户：</p>
          <p>用户名: super, 密码: 123</p>
          <button class="btn btn-secondary" (click)="showRegister = !showRegister">
            {{ showRegister ? '返回登录' : '注册新用户' }}
          </button>
        </div>

        <div *ngIf="showRegister" class="register-form">
          <h3>注册新用户</h3>
          <form (ngSubmit)="onRegister()" #registerForm="ngForm">
            <div class="form-group">
              <label for="newUsername">用户名:</label>
              <input
                type="text"
                id="newUsername"
                name="newUsername"
                [(ngModel)]="newUser.username"
                required
                placeholder="请输入用户名">
            </div>

            <div class="form-group">
              <label for="email">邮箱:</label>
              <input
                type="email"
                id="email"
                name="email"
                [(ngModel)]="newUser.email"
                required
                placeholder="请输入邮箱">
            </div>

            <div class="form-group">
              <label for="newPassword">密码:</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                [(ngModel)]="newUser.password"
                required
                placeholder="请输入密码(至少6位)">
            </div>

            <button type="submit" class="btn btn-primary">注册</button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .login-form {
      background: white;
      padding: 40px;
      border-radius: 10px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      width: 100%;
      max-width: 400px;
    }

    .login-form h2 {
      text-align: center;
      margin-bottom: 30px;
      color: #333;
    }

    .login-help {
      margin-top: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }

    .login-help p {
      margin: 5px 0;
    }

    .btn-secondary {
      background-color: #6c757d;
      color: white;
      margin-top: 10px;
    }

    .btn-secondary:hover {
      background-color: #545b62;
    }

    .register-form {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }

    .register-form h3 {
      text-align: center;
      margin-bottom: 20px;
      color: #333;
    }
  `]
})
export class LoginComponent {
  credentials: LoginRequest = {
    username: '',
    password: ''
  };

  newUser = {
    username: '',
    email: '',
    password: ''
  };

  errorMessage = '';
  isLoading = false;
  showRegister = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onLogin(): void {
    if (!this.credentials.username || !this.credentials.password) {
      this.errorMessage = '请填写用户名和密码';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = response.message || '登录失败';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = '登录失败，请重试';
        console.error('Login error:', error);
      }
    });
  }

  onRegister(): void {
    if (!this.newUser.username || !this.newUser.email || !this.newUser.password) {
      this.errorMessage = '请填写所有注册信息';
      return;
    }

    if (this.newUser.password.length < 6) {
      this.errorMessage = '密码至少需要6位字符';
      return;
    }

    this.authService.registerUser(this.newUser).subscribe({
      next: (response) => {
        if (response.success) {
          alert('注册成功！请使用新账户登录。');
          this.showRegister = false;
          this.newUser = { username: '', email: '', password: '' };
        }
      },
      error: (error) => {
        this.errorMessage = '注册失败，请重试';
        console.error('Register error:', error);
      }
    });
  }
}