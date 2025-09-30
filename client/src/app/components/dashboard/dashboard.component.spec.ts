import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../services/auth.service';
import { GroupService } from '../../services/group.service';
import { ProfileService } from '../../services/profile.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { User } from '../../models/user.model';
import { Group } from '../../models/group.model';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let groupService: jasmine.SpyObj<GroupService>;
  let profileService: jasmine.SpyObj<ProfileService>;
  let router: jasmine.SpyObj<Router>;

  const mockUser: User = {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    roles: ['user'],
    groups: ['1']
  };

  const mockSuperAdmin: User = {
    id: '2',
    username: 'superadmin',
    email: 'admin@example.com',
    roles: ['user', 'super-admin'],
    groups: ['1']
  };

  const mockGroup: Group = {
    id: '1',
    _id: '1',
    name: 'Test Group',
    description: 'A test group',
    createdBy: '1',
    memberIds: ['1'],
    adminIds: ['1'],
    channels: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(async () => {
    const authSpy = jasmine.createSpyObj('AuthService', [
      'getCurrentUser', 'isSuperAdmin', 'isGroupAdmin', 'getAllUsers',
      'updateUserRoles', 'deleteUser', 'logout'
    ]);
    const groupSpy = jasmine.createSpyObj('GroupService', [
      'getUserGroups', 'getAllGroups', 'getAvailableGroups', 'getPendingApplications',
      'createGroup', 'applyToGroup', 'reviewApplication', 'createUser', 'deleteGroup'
    ]);
    const profileSpy = jasmine.createSpyObj('ProfileService', ['getAvatarUrl']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        DashboardComponent,
        FormsModule,
        CommonModule
      ],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: GroupService, useValue: groupSpy },
        { provide: ProfileService, useValue: profileSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    groupService = TestBed.inject(GroupService) as jasmine.SpyObj<GroupService>;
    profileService = TestBed.inject(ProfileService) as jasmine.SpyObj<ProfileService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Setup default spies
    authService.getCurrentUser.and.returnValue(mockUser);
    authService.isSuperAdmin.and.returnValue(false);
    authService.isGroupAdmin.and.returnValue(false);
    authService.getAllUsers.and.returnValue(of([]));
    groupService.getUserGroups.and.returnValue(of([]));
    groupService.getAvailableGroups.and.returnValue(of([]));
    groupService.getPendingApplications.and.returnValue(of([]));
    groupService.getAllGroups.and.returnValue(of([]));
    profileService.getAvatarUrl.and.returnValue('/assets/default-avatar.svg');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.activeTab).toBe('users');
    expect(component.showCreateGroup).toBe(false);
    expect(component.groups).toEqual([]);
    expect(component.allUsers).toEqual([]);
    expect(component.availableGroups).toEqual([]);
  });

  describe('ngOnInit', () => {
    it('should load basic data for regular user', () => {
      component.ngOnInit();

      expect(authService.getCurrentUser).toHaveBeenCalled();
      expect(groupService.getUserGroups).toHaveBeenCalled();
      expect(groupService.getAvailableGroups).toHaveBeenCalled();
      expect(component.currentUser).toEqual(mockUser);
    });

    it('should load additional data for super admin', () => {
      authService.getCurrentUser.and.returnValue(mockSuperAdmin);
      authService.isSuperAdmin.and.returnValue(true);
      authService.getAllUsers.and.returnValue(of([]));
      groupService.getAllGroups.and.returnValue(of([]));

      component.ngOnInit();

      expect(authService.getAllUsers).toHaveBeenCalled();
      expect(groupService.getAllGroups).toHaveBeenCalled();
    });

    it('should load pending applications for group admin', () => {
      const groupAdminUser = { ...mockUser, roles: ['user', 'group-admin'] };
      authService.getCurrentUser.and.returnValue(groupAdminUser);
      authService.isGroupAdmin.and.returnValue(true);
      groupService.getPendingApplications.and.returnValue(of([]));

      component.ngOnInit();

      expect(groupService.getPendingApplications).toHaveBeenCalled();
    });
  });

  describe('role checking methods', () => {
    it('should check super admin correctly', () => {
      authService.isSuperAdmin.and.returnValue(true);
      expect(component.isSuperAdmin()).toBe(true);

      authService.isSuperAdmin.and.returnValue(false);
      expect(component.isSuperAdmin()).toBe(false);
    });

    it('should check group admin correctly', () => {
      authService.isGroupAdmin.and.returnValue(true);
      expect(component.isGroupAdmin()).toBe(true);

      authService.isGroupAdmin.and.returnValue(false);
      expect(component.isGroupAdmin()).toBe(false);
    });

    it('should determine group creation permission', () => {
      authService.isSuperAdmin.and.returnValue(false);
      authService.isGroupAdmin.and.returnValue(false);
      expect(component.canCreateGroup()).toBe(false);

      authService.isGroupAdmin.and.returnValue(true);
      expect(component.canCreateGroup()).toBe(true);

      authService.isSuperAdmin.and.returnValue(true);
      expect(component.canCreateGroup()).toBe(true);
    });

    it('should determine group management permission', () => {
      component.currentUser = mockUser;
      expect(component.canManageGroups()).toBe(false);

      component.currentUser = { ...mockUser, roles: ['user', 'group-admin'] };
      expect(component.canManageGroups()).toBe(true);

      authService.isSuperAdmin.and.returnValue(true);
      expect(component.canManageGroups()).toBe(true);
    });
  });

  describe('role display methods', () => {
    it('should return correct role class', () => {
      authService.isSuperAdmin.and.returnValue(true);
      expect(component.getRoleClass()).toBe('super-admin');

      authService.isSuperAdmin.and.returnValue(false);
      authService.isGroupAdmin.and.returnValue(true);
      expect(component.getRoleClass()).toBe('group-admin');

      authService.isGroupAdmin.and.returnValue(false);
      expect(component.getRoleClass()).toBe('user');
    });

    it('should return correct role display text', () => {
      authService.isSuperAdmin.and.returnValue(true);
      expect(component.getRoleDisplay()).toBe('超级管理员');

      authService.isSuperAdmin.and.returnValue(false);
      authService.isGroupAdmin.and.returnValue(true);
      expect(component.getRoleDisplay()).toBe('群组管理员');

      authService.isGroupAdmin.and.returnValue(false);
      expect(component.getRoleDisplay()).toBe('普通用户');
    });
  });

  describe('group management', () => {
    it('should check if user is admin of a group', () => {
      component.currentUser = mockUser;
      const group = { ...mockGroup, adminIds: ['1'] };

      expect(component.isGroupAdminOf(group)).toBe(true);

      const nonAdminGroup = { ...mockGroup, adminIds: ['2'] };
      expect(component.isGroupAdminOf(nonAdminGroup)).toBe(false);
    });

    it('should handle object adminIds when checking group admin', () => {
      component.currentUser = mockUser;
      const group = { ...mockGroup, adminIds: [{ _id: '1' }, { id: '2' }] };

      expect(component.isGroupAdminOf(group)).toBe(true);
    });

    it('should enter group with correct ID', () => {
      const group = { ...mockGroup, _id: 'mongo-id', id: 'standard-id' };

      component.enterGroup(group);

      expect(router.navigate).toHaveBeenCalledWith(['/chat', 'mongo-id']);
    });

    it('should handle missing group ID when entering group', () => {
      spyOn(console, 'error');
      const invalidGroup = { ...mockGroup, _id: undefined, id: undefined };

      component.enterGroup(invalidGroup);

      expect(console.error).toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should create group successfully', () => {
      component.newGroupName = 'New Group';
      component.newGroupDescription = 'New Description';
      groupService.createGroup.and.returnValue(of(mockGroup));

      component.createGroup();

      expect(groupService.createGroup).toHaveBeenCalledWith({
        name: 'New Group',
        description: 'New Description'
      });
      expect(component.groups).toContain(mockGroup);
      expect(component.showCreateGroup).toBe(false);
      expect(component.newGroupName).toBe('');
      expect(component.newGroupDescription).toBe('');
    });

    it('should not create group with empty name', () => {
      component.newGroupName = '';

      component.createGroup();

      expect(groupService.createGroup).not.toHaveBeenCalled();
    });

    it('should cancel group creation', () => {
      component.showCreateGroup = true;
      component.newGroupName = 'Test';
      component.newGroupDescription = 'Test Description';

      component.cancelCreateGroup();

      expect(component.showCreateGroup).toBe(false);
      expect(component.newGroupName).toBe('');
      expect(component.newGroupDescription).toBe('');
    });
  });

  describe('user management', () => {
    it('should promote user to group admin with confirmation', () => {
      const user = { ...mockUser, id: '2', roles: ['user'] };
      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(window, 'alert');
      authService.updateUserRoles.and.returnValue(of({ success: true }));

      component.promoteToGroupAdmin(user);

      expect(window.confirm).toHaveBeenCalled();
      expect(authService.updateUserRoles).toHaveBeenCalledWith('2', ['user', 'group-admin']);
      expect(window.alert).toHaveBeenCalledWith('用户权限已更新');
    });

    it('should not promote user if confirmation is cancelled', () => {
      const user = { ...mockUser, id: '2', roles: ['user'] };
      spyOn(window, 'confirm').and.returnValue(false);

      component.promoteToGroupAdmin(user);

      expect(authService.updateUserRoles).not.toHaveBeenCalled();
    });

    it('should handle user promotion error', () => {
      const user = { ...mockUser, id: '2', roles: ['user'] };
      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(window, 'alert');
      spyOn(console, 'error');
      authService.updateUserRoles.and.returnValue(throwError(() => new Error('Update failed')));

      component.promoteToGroupAdmin(user);

      expect(console.error).toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalledWith('更新用户权限失败');
    });

    it('should delete user with confirmation', () => {
      const user = { ...mockUser, id: '2' };
      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(window, 'alert');
      authService.deleteUser.and.returnValue(of({ success: true }));

      component.deleteUser(user);

      expect(window.confirm).toHaveBeenCalled();
      expect(authService.deleteUser).toHaveBeenCalledWith('2');
      expect(window.alert).toHaveBeenCalledWith('用户已删除');
    });

    it('should create new user', () => {
      component.newUserUsername = 'newuser';
      component.newUserEmail = 'new@example.com';
      component.newUserPassword = 'password123';
      spyOn(window, 'alert');
      groupService.createUser.and.returnValue(of(mockUser));

      component.createUser();

      expect(groupService.createUser).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        roles: ['user']
      });
      expect(window.alert).toHaveBeenCalledWith('用户创建成功');
      expect(component.newUserUsername).toBe('');
      expect(component.newUserEmail).toBe('');
      expect(component.newUserPassword).toBe('');
    });

    it('should not create user with missing fields', () => {
      component.newUserUsername = '';
      spyOn(window, 'alert');

      component.createUser();

      expect(window.alert).toHaveBeenCalledWith('请填写所有必填字段');
      expect(groupService.createUser).not.toHaveBeenCalled();
    });
  });

  describe('group applications', () => {
    it('should apply to group', () => {
      component.applyToGroup(mockGroup);

      expect(component.selectedGroup).toEqual(mockGroup);
      expect(component.showApplyGroup).toBe(true);
    });

    it('should submit application', () => {
      component.selectedGroup = mockGroup;
      component.applicationMessage = 'Please let me join';
      spyOn(window, 'alert');
      groupService.applyToGroup.and.returnValue(of(true));

      component.submitApplication();

      expect(groupService.applyToGroup).toHaveBeenCalledWith('1', 'Please let me join');
      expect(window.alert).toHaveBeenCalledWith('申请已提交，等待管理员审核');
      expect(component.showApplyGroup).toBe(false);
      expect(component.applicationMessage).toBe('');
      expect(component.selectedGroup).toBeNull();
    });

    it('should review application approval', () => {
      const application = { _id: 'app1', id: 'app1' };
      spyOn(window, 'alert');
      groupService.reviewApplication.and.returnValue(of(true));

      component.reviewApplication(application, 'approve');

      expect(groupService.reviewApplication).toHaveBeenCalledWith('app1', 'approve', '');
      expect(window.alert).toHaveBeenCalledWith('申请已批准');
    });

    it('should review application rejection with reason', () => {
      const application = { _id: 'app1', id: 'app1' };
      spyOn(window, 'prompt').and.returnValue('Not suitable');
      spyOn(window, 'alert');
      groupService.reviewApplication.and.returnValue(of(true));

      component.reviewApplication(application, 'reject');

      expect(window.prompt).toHaveBeenCalled();
      expect(groupService.reviewApplication).toHaveBeenCalledWith('app1', 'reject', 'Not suitable');
      expect(window.alert).toHaveBeenCalledWith('申请已拒绝');
    });
  });

  describe('group deletion', () => {
    it('should check delete group permission for super admin', () => {
      component.currentUser = mockSuperAdmin;
      authService.isSuperAdmin.and.returnValue(true);

      expect(component.canDeleteGroup(mockGroup)).toBe(true);
    });

    it('should check delete group permission for group creator', () => {
      component.currentUser = mockUser;
      const creatorGroup = { ...mockGroup, createdBy: '1' };

      expect(component.canDeleteGroup(creatorGroup)).toBe(true);

      const otherGroup = { ...mockGroup, createdBy: '2' };
      expect(component.canDeleteGroup(otherGroup)).toBe(false);
    });

    it('should delete group with confirmation', () => {
      const event = new Event('click');
      spyOn(event, 'stopPropagation');
      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(window, 'alert');
      groupService.deleteGroup.and.returnValue(of({ success: true, message: 'Deleted' }));
      component.groups = [mockGroup];

      component.deleteGroup(mockGroup, event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(window.confirm).toHaveBeenCalled();
      expect(groupService.deleteGroup).toHaveBeenCalledWith('1');
      expect(window.alert).toHaveBeenCalledWith('群组已成功删除');
      expect(component.groups).toEqual([]);
    });

    it('should not delete group if confirmation is cancelled', () => {
      const event = new Event('click');
      spyOn(window, 'confirm').and.returnValue(false);

      component.deleteGroup(mockGroup, event);

      expect(groupService.deleteGroup).not.toHaveBeenCalled();
    });
  });

  describe('profile and navigation', () => {
    it('should get avatar URL', () => {
      const avatarUrl = component.getAvatarUrl('avatar.jpg');
      expect(profileService.getAvatarUrl).toHaveBeenCalledWith('avatar.jpg');
    });

    it('should handle avatar error', () => {
      const event = { target: { src: '' } };
      component.onAvatarError(event);
      expect(event.target.src).toBe('/assets/default-avatar.svg');
    });

    it('should navigate to profile', () => {
      component.goToProfile();
      expect(router.navigate).toHaveBeenCalledWith(['/profile']);
    });

    it('should logout and navigate to login', () => {
      component.logout();
      expect(authService.logout).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('data loading methods', () => {
    it('should load user groups', () => {
      const groups = [mockGroup];
      groupService.getUserGroups.and.returnValue(of(groups));

      component.loadUserGroups();

      expect(groupService.getUserGroups).toHaveBeenCalled();
      expect(component.groups).toEqual(groups);
    });

    it('should handle error when loading user groups', () => {
      spyOn(console, 'error');
      groupService.getUserGroups.and.returnValue(throwError(() => new Error('Load failed')));

      component.loadUserGroups();

      expect(console.error).toHaveBeenCalled();
    });

    it('should load all users', () => {
      const users = [mockUser];
      authService.getAllUsers.and.returnValue(of(users));

      component.loadAllUsers();

      expect(authService.getAllUsers).toHaveBeenCalled();
      expect(component.allUsers).toEqual(users);
    });

    it('should load available groups', () => {
      const groups = [mockGroup];
      groupService.getAvailableGroups.and.returnValue(of(groups));

      component.loadAvailableGroups();

      expect(groupService.getAvailableGroups).toHaveBeenCalled();
      expect(component.availableGroups).toEqual(groups);
    });

    it('should load pending applications', () => {
      const applications = [{ id: '1', userId: '2', groupId: '1' }];
      groupService.getPendingApplications.and.returnValue(of(applications));

      component.loadPendingApplications();

      expect(groupService.getPendingApplications).toHaveBeenCalled();
      expect(component.pendingApplications).toEqual(applications);
    });
  });
});