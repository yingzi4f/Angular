export interface Group {
  id: string;
  name: string;
  description?: string;
  adminIds: string[];
  memberIds: string[];
  channels: Channel[];
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  groupId: string;
  memberIds: string[];
  messages: Message[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderUsername: string;
  channelId: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
}