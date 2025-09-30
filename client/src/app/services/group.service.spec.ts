import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GroupService } from './group.service';
import { AuthService } from './auth.service';
import { Group, Channel, Message } from '../models/group.model';
import { User } from '../models/user.model';

describe('GroupService', () => {
  let service: GroupService;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;
  const API_URL = 'http://localhost:3000/api';

  const mockUser: User = {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    roles: ['user'],
    groups: ['1']
  };

  const mockGroup: Group = {
    id: '1',
    name: 'Test Group',
    description: 'A test group',
    createdBy: '1',
    memberIds: ['1'],
    adminIds: ['1'],
    channels: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockChannel: Channel = {
    id: '1',
    name: 'General',
    description: 'General channel',
    groupId: '1',
    memberIds: ['1'],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockMessage: Message = {
    id: '1',
    content: 'Test message',
    type: 'text',
    senderId: '1',
    senderUsername: 'testuser',
    channelId: '1',
    createdAt: new Date()
  };

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        GroupService,
        { provide: AuthService, useValue: authSpy }
      ]
    });

    service = TestBed.inject(GroupService);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  afterEach(() => {
    if (httpMock) {
      httpMock.verify();
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getUserGroups', () => {
    it('should return user groups when authenticated', () => {
      authService.getCurrentUser.and.returnValue(mockUser);
      const apiResponse = { success: true, groups: [mockGroup] };

      service.getUserGroups().subscribe(groups => {
        expect(groups).toEqual([mockGroup]);
      });

      const req = httpMock.expectOne(`${API_URL}/groups`);
      expect(req.request.method).toBe('GET');
      req.flush(apiResponse);
    });

    it('should return empty array when not authenticated', () => {
      authService.getCurrentUser.and.returnValue(null);

      service.getUserGroups().subscribe(groups => {
        expect(groups).toEqual([]);
      });

      httpMock.expectNone(`${API_URL}/groups`);
    });

    it('should handle missing groups in response', () => {
      authService.getCurrentUser.and.returnValue(mockUser);
      const apiResponse = { success: true, groups: null };

      service.getUserGroups().subscribe(groups => {
        expect(groups).toEqual([]);
      });

      const req = httpMock.expectOne(`${API_URL}/groups`);
      req.flush(apiResponse);
    });
  });

  describe('getAllGroups', () => {
    it('should return all groups', () => {
      const apiResponse = { success: true, groups: [mockGroup] };

      service.getAllGroups().subscribe(groups => {
        expect(groups).toEqual([mockGroup]);
      });

      const req = httpMock.expectOne(`${API_URL}/groups`);
      expect(req.request.method).toBe('GET');
      req.flush(apiResponse);
    });
  });

  describe('getGroupById', () => {
    it('should return specific group', () => {
      const groupId = '1';
      const apiResponse = { success: true, group: mockGroup };

      service.getGroupById(groupId).subscribe(group => {
        expect(group).toEqual(mockGroup);
      });

      const req = httpMock.expectOne(`${API_URL}/groups/${groupId}`);
      expect(req.request.method).toBe('GET');
      req.flush(apiResponse);
    });
  });

  describe('createGroup', () => {
    it('should create group when authenticated', () => {
      authService.getCurrentUser.and.returnValue(mockUser);
      const groupData = { name: 'New Group', description: 'A new group' };
      const apiResponse = { success: true, group: mockGroup };

      service.createGroup(groupData).subscribe(group => {
        expect(group).toEqual(mockGroup);
      });

      const req = httpMock.expectOne(`${API_URL}/groups`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        name: groupData.name,
        description: groupData.description,
        createdBy: mockUser.id
      });
      req.flush(apiResponse);
    });

    it('should throw error when not authenticated', () => {
      authService.getCurrentUser.and.returnValue(null);
      const groupData = { name: 'New Group', description: 'A new group' };

      expect(() => service.createGroup(groupData)).toThrowError('User not authenticated');
    });
  });

  describe('createChannel', () => {
    it('should create channel', () => {
      const groupId = '1';
      const channelData = { name: 'New Channel', description: 'A new channel' };
      const apiResponse = { success: true, channel: mockChannel };

      service.createChannel(groupId, channelData).subscribe(channel => {
        expect(channel).toEqual(mockChannel);
      });

      const req = httpMock.expectOne(`${API_URL}/groups/${groupId}/channels`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        name: channelData.name,
        description: channelData.description,
        groupId: groupId
      });
      req.flush(apiResponse);
    });
  });

  describe('getGroupChannels', () => {
    it('should return group channels', () => {
      const groupId = '1';
      const channels = [mockChannel];

      service.getGroupChannels(groupId).subscribe(result => {
        expect(result).toEqual(channels);
      });

      const req = httpMock.expectOne(`${API_URL}/groups/${groupId}/channels`);
      expect(req.request.method).toBe('GET');
      req.flush(channels);
    });
  });

  describe('member management', () => {
    it('should add user to group', () => {
      const groupId = '1';
      const userId = '2';
      const apiResponse = { success: true, message: 'User added' };

      service.addUserToGroup(groupId, userId).subscribe(result => {
        expect(result).toBe(true);
      });

      const req = httpMock.expectOne(`${API_URL}/groups/${groupId}/members`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ userId });
      req.flush(apiResponse);
    });

    it('should remove user from group', () => {
      const groupId = '1';
      const userId = '2';
      const apiResponse = { success: true, message: 'User removed' };

      service.removeUserFromGroup(groupId, userId).subscribe(result => {
        expect(result).toBe(true);
      });

      const req = httpMock.expectOne(`${API_URL}/groups/${groupId}/members/${userId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(apiResponse);
    });
  });

  describe('message handling', () => {
    it('should send text message when authenticated', () => {
      authService.getCurrentUser.and.returnValue(mockUser);
      const groupId = '1';
      const channelId = '1';
      const content = 'Test message';
      const apiResponse = { success: true, message: mockMessage };

      service.sendMessage(groupId, channelId, content).subscribe(message => {
        expect(message).toEqual(mockMessage);
      });

      const req = httpMock.expectOne(`${API_URL}/groups/${groupId}/channels/${channelId}/messages`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        content: content,
        type: 'text'
      });
      req.flush(apiResponse);
    });

    it('should throw error when sending message while not authenticated', () => {
      authService.getCurrentUser.and.returnValue(null);
      const groupId = '1';
      const channelId = '1';
      const content = 'Test message';

      expect(() => service.sendMessage(groupId, channelId, content))
        .toThrowError('User not authenticated');
    });

    it('should send image message when authenticated', () => {
      authService.getCurrentUser.and.returnValue(mockUser);
      const groupId = '1';
      const channelId = '1';
      const imageUrl = 'http://example.com/image.jpg';
      const fileSize = 1024;
      const mimeType = 'image/jpeg';
      const apiResponse = { success: true, message: mockMessage };

      service.sendImageMessage(groupId, channelId, imageUrl, fileSize, mimeType)
        .subscribe(message => {
          expect(message).toEqual(mockMessage);
        });

      const req = httpMock.expectOne(`${API_URL}/groups/${groupId}/channels/${channelId}/messages`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        content: '',
        type: 'image',
        fileUrl: imageUrl,
        fileSize: fileSize,
        mimeType: mimeType
      });
      req.flush(apiResponse);
    });

    it('should get channel messages', () => {
      const groupId = '1';
      const channelId = '1';
      const limit = 30;
      const apiResponse = { success: true, messages: [mockMessage] };

      service.getChannelMessages(groupId, channelId, limit).subscribe(messages => {
        expect(messages).toEqual([mockMessage]);
      });

      const req = httpMock.expectOne(`${API_URL}/groups/${groupId}/channels/${channelId}/messages?limit=${limit}`);
      expect(req.request.method).toBe('GET');
      req.flush(apiResponse);
    });
  });

  describe('file upload', () => {
    it('should upload image file', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const apiResponse = {
        success: true,
        fileUrl: 'http://example.com/uploads/test.jpg',
        fileInfo: {
          originalName: 'test.jpg',
          size: 1024,
          mimeType: 'image/jpeg'
        }
      };

      service.uploadImage(file).subscribe(result => {
        expect(result).toEqual({
          fileUrl: apiResponse.fileUrl,
          fileName: apiResponse.fileInfo.originalName,
          fileSize: apiResponse.fileInfo.size,
          mimeType: apiResponse.fileInfo.mimeType
        });
      });

      const req = httpMock.expectOne(`${API_URL}/upload/image`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);
      req.flush(apiResponse);
    });
  });

  describe('group applications', () => {
    it('should get available groups', () => {
      const apiResponse = { success: true, groups: [mockGroup] };

      service.getAvailableGroups().subscribe(groups => {
        expect(groups).toEqual([mockGroup]);
      });

      const req = httpMock.expectOne(`${API_URL}/groups/available`);
      expect(req.request.method).toBe('GET');
      req.flush(apiResponse);
    });

    it('should apply to group', () => {
      const groupId = '1';
      const message = 'Please let me join';
      const apiResponse = { success: true, message: 'Application submitted' };

      service.applyToGroup(groupId, message).subscribe(result => {
        expect(result).toBe(true);
      });

      const req = httpMock.expectOne(`${API_URL}/groups/${groupId}/apply`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ message });
      req.flush(apiResponse);
    });

    it('should get pending applications for specific group', () => {
      const groupId = '1';
      const applications = [{ id: '1', userId: '2', groupId: '1', status: 'pending' }];
      const apiResponse = { success: true, applications };

      service.getPendingApplications(groupId).subscribe(result => {
        expect(result).toEqual(applications);
      });

      const req = httpMock.expectOne(`${API_URL}/groups/${groupId}/applications`);
      expect(req.request.method).toBe('GET');
      req.flush(apiResponse);
    });

    it('should get all pending applications', () => {
      const applications = [{ id: '1', userId: '2', groupId: '1', status: 'pending' }];
      const apiResponse = { success: true, applications };

      service.getPendingApplications().subscribe(result => {
        expect(result).toEqual(applications);
      });

      const req = httpMock.expectOne(`${API_URL}/groups/applications`);
      expect(req.request.method).toBe('GET');
      req.flush(apiResponse);
    });

    it('should review application', () => {
      const applicationId = '1';
      const action = 'approve';
      const message = 'Welcome to the group';
      const apiResponse = { success: true, message: 'Application approved' };

      service.reviewApplication(applicationId, action, message).subscribe(result => {
        expect(result).toBe(true);
      });

      const req = httpMock.expectOne(`${API_URL}/groups/applications/${applicationId}/review`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ action, message });
      req.flush(apiResponse);
    });
  });

  describe('admin operations', () => {
    it('should create user', () => {
      const userData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        roles: ['user']
      };
      const apiResponse = { success: true, user: userData };

      service.createUser(userData).subscribe(result => {
        expect(result).toEqual(userData);
      });

      const req = httpMock.expectOne(`${API_URL}/auth/admin/create-user`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(userData);
      req.flush(apiResponse);
    });

    it('should promote user to group admin', () => {
      const groupId = '1';
      const userId = '2';
      const apiResponse = { success: true, message: 'User promoted' };

      service.promoteUserToGroupAdmin(groupId, userId).subscribe(result => {
        expect(result).toEqual(apiResponse);
      });

      const req = httpMock.expectOne(`${API_URL}/groups/${groupId}/members/${userId}/promote`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({});
      req.flush(apiResponse);
    });

    it('should demote user from group admin', () => {
      const groupId = '1';
      const userId = '2';
      const apiResponse = { success: true, message: 'User demoted' };

      service.demoteUserFromGroupAdmin(groupId, userId).subscribe(result => {
        expect(result).toEqual(apiResponse);
      });

      const req = httpMock.expectOne(`${API_URL}/groups/${groupId}/members/${userId}/demote`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({});
      req.flush(apiResponse);
    });

    it('should delete channel', () => {
      const groupId = '1';
      const channelId = '1';
      const apiResponse = { success: true, message: 'Channel deleted' };

      service.deleteChannel(groupId, channelId).subscribe(result => {
        expect(result).toEqual(apiResponse);
      });

      const req = httpMock.expectOne(`${API_URL}/groups/${groupId}/channels/${channelId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(apiResponse);
    });

    it('should delete group', () => {
      const groupId = '1';
      const apiResponse = { success: true, message: 'Group deleted' };

      service.deleteGroup(groupId).subscribe(result => {
        expect(result).toEqual(apiResponse);
      });

      const req = httpMock.expectOne(`${API_URL}/groups/${groupId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(apiResponse);
    });
  });

  describe('channel member management', () => {
    it('should add member to channel', () => {
      const groupId = '1';
      const channelId = '1';
      const userId = '2';
      const apiResponse = { success: true, message: 'Member added to channel' };

      service.addMemberToChannel(groupId, channelId, userId).subscribe(result => {
        expect(result).toEqual(apiResponse);
      });

      const req = httpMock.expectOne(`${API_URL}/groups/${groupId}/channels/${channelId}/members`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ userId });
      req.flush(apiResponse);
    });

    it('should remove member from channel', () => {
      const groupId = '1';
      const channelId = '1';
      const userId = '2';
      const apiResponse = { success: true, message: 'Member removed from channel' };

      service.removeMemberFromChannel(groupId, channelId, userId).subscribe(result => {
        expect(result).toEqual(apiResponse);
      });

      const req = httpMock.expectOne(`${API_URL}/groups/${groupId}/channels/${channelId}/members/${userId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(apiResponse);
    });
  });
});