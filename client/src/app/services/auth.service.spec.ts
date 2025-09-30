import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { User, LoginRequest, LoginResponse } from '../models/user.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const API_URL = 'http://localhost:3000/api';

  const mockUser: User = {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    roles: ['user'],
    groups: []
  };

  const mockLoginRequest: LoginRequest = {
    username: 'testuser',
    password: 'password123'
  };

  const mockLoginResponse: LoginResponse = {
    success: true,
    user: mockUser,
    token: 'mock-jwt-token',
    message: 'Login successful'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    if (httpMock) {
      httpMock.verify();
    }
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('constructor', () => {
    it('should initialize currentUser from localStorage if present', () => {
      localStorage.setItem('currentUser', JSON.stringify(mockUser));
      const newService = new AuthService(TestBed.inject(HttpClient));
      expect(newService.getCurrentUser()).toEqual(mockUser);
    });

    it('should have null currentUser if localStorage is empty', () => {
      expect(service.getCurrentUser()).toBeNull();
    });
  });

  describe('login', () => {
    it('should login successfully and store user data', () => {
      service.login(mockLoginRequest).subscribe(response => {
        expect(response).toEqual(mockLoginResponse);
        expect(service.getCurrentUser()).toEqual(mockUser);
        expect(localStorage.getItem('currentUser')).toEqual(JSON.stringify(mockUser));
        expect(localStorage.getItem('token')).toEqual('mock-jwt-token');
      });

      const req = httpMock.expectOne(`${API_URL}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockLoginRequest);
      req.flush(mockLoginResponse);
    });

    it('should handle login failure', () => {
      const errorResponse = { success: false, message: 'Invalid credentials' };

      service.login(mockLoginRequest).subscribe(response => {
        expect(response).toEqual(errorResponse);
        expect(service.getCurrentUser()).toBeNull();
        expect(localStorage.getItem('currentUser')).toBeNull();
        expect(localStorage.getItem('token')).toBeNull();
      });

      const req = httpMock.expectOne(`${API_URL}/auth/login`);
      req.flush(errorResponse);
    });
  });

  describe('logout', () => {
    it('should clear user data and localStorage', () => {
      // Setup logged in state
      localStorage.setItem('currentUser', JSON.stringify(mockUser));
      localStorage.setItem('token', 'mock-jwt-token');
      service.updateCurrentUser(mockUser);

      service.logout();

      expect(service.getCurrentUser()).toBeNull();
      expect(localStorage.getItem('currentUser')).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user is logged in', () => {
      service.updateCurrentUser(mockUser);
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should return false when user is not logged in', () => {
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('updateCurrentUser', () => {
    it('should update current user and localStorage', () => {
      const updatedUser = { ...mockUser, username: 'updateduser' };

      service.updateCurrentUser(updatedUser);

      expect(service.getCurrentUser()).toEqual(updatedUser);
      expect(localStorage.getItem('currentUser')).toEqual(JSON.stringify(updatedUser));
    });
  });

  describe('role checking methods', () => {
    it('should correctly check user roles', () => {
      const userWithRoles = { ...mockUser, roles: ['user', 'group-admin'] };
      service.updateCurrentUser(userWithRoles);

      expect(service.hasRole('user')).toBe(true);
      expect(service.hasRole('group-admin')).toBe(true);
      expect(service.hasRole('super-admin')).toBe(false);
      expect(service.isGroupAdmin()).toBe(true);
      expect(service.isSuperAdmin()).toBe(false);
    });

    it('should return false for role checks when user is not logged in', () => {
      expect(service.hasRole('user')).toBe(false);
      expect(service.isGroupAdmin()).toBe(false);
      expect(service.isSuperAdmin()).toBe(false);
    });

    it('should correctly identify super admin', () => {
      const superAdminUser = { ...mockUser, roles: ['user', 'super-admin'] };
      service.updateCurrentUser(superAdminUser);

      expect(service.isSuperAdmin()).toBe(true);
      expect(service.hasRole('super-admin')).toBe(true);
    });
  });

  describe('user management methods', () => {
    it('should delete user', () => {
      const userId = '123';
      const expectedResponse = { success: true, message: 'User deleted' };

      service.deleteUser(userId).subscribe(response => {
        expect(response).toEqual(expectedResponse);
      });

      const req = httpMock.expectOne(`${API_URL}/auth/users/${userId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(expectedResponse);
    });

    it('should update user roles', () => {
      const userId = '123';
      const roles = ['user', 'group-admin'];
      const expectedResponse = { success: true, message: 'User promoted' };

      service.updateUserRoles(userId, roles).subscribe(response => {
        expect(response).toEqual(expectedResponse);
      });

      const req = httpMock.expectOne(`${API_URL}/auth/users/${userId}/promote`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ role: 'group-admin' });
      req.flush(expectedResponse);
    });

    it('should register new user', () => {
      const newUser = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123'
      };
      const expectedResponse = { success: true, user: newUser };

      service.registerUser(newUser).subscribe(response => {
        expect(response).toEqual(expectedResponse);
      });

      const req = httpMock.expectOne(`${API_URL}/auth/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newUser);
      req.flush(expectedResponse);
    });

    it('should get all users', () => {
      const mockUsers = [mockUser, { ...mockUser, id: '2', username: 'user2' }];
      const apiResponse = { success: true, users: mockUsers };

      service.getAllUsers().subscribe(users => {
        expect(users).toEqual(mockUsers);
      });

      const req = httpMock.expectOne(`${API_URL}/auth/users`);
      expect(req.request.method).toBe('GET');
      req.flush(apiResponse);
    });

    it('should handle empty users array', () => {
      const apiResponse = { success: true, users: null };

      service.getAllUsers().subscribe(users => {
        expect(users).toEqual([]);
      });

      const req = httpMock.expectOne(`${API_URL}/auth/users`);
      req.flush(apiResponse);
    });
  });

  describe('currentUser$ observable', () => {
    it('should emit current user changes', () => {
      const userChanges: (User | null)[] = [];

      service.currentUser$.subscribe(user => {
        userChanges.push(user);
      });

      service.updateCurrentUser(mockUser);
      service.logout();

      expect(userChanges).toEqual([null, mockUser, null]);
    });
  });
});