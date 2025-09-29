export interface Group {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  adminIds: any[];
  memberIds: any[];
  pendingApplications?: GroupApplication[];
  channels: Channel[];
  createdBy: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  isPrivate?: boolean;
  maxMembers?: number;
  __v?: number;
}

export interface GroupApplication {
  id?: string;
  _id?: string;
  groupId: string;
  userId: string;
  username: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: Date | string;
  reviewedBy?: string;
  reviewedAt?: Date | string;
  message?: string;
}

export interface Channel {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  groupId: string;
  memberIds: string[];
  messages?: Message[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Message {
  id?: string;
  _id?: string;
  content: string;
  senderId: string;
  senderUsername: string;
  channelId: string;
  timestamp?: Date;
  createdAt?: Date;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
}