export interface User {
  id?: string;
  _id?: string;  // MongoDB ObjectId
  username: string;
  email: string;
  roles: string[];
  groups: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  message?: string;
  token?: string;
}