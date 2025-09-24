import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest, HttpEventType } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface UploadResponse {
  success: boolean;
  message: string;
  fileUrl?: string;
  fileInfo?: {
    originalName: string;
    filename: string;
    size: number;
    mimeType: string;
    width?: number;
    height?: number;
  };
}

export interface UploadProgress {
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  response?: UploadResponse;
}

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private readonly API_URL = 'http://localhost:3000/api/upload';

  constructor(private http: HttpClient) {}

  // 上传头像
  uploadAvatar(file: File): Observable<UploadProgress> {
    const formData = new FormData();
    formData.append('avatar', file);

    return this.uploadWithProgress(`${this.API_URL}/avatar`, formData);
  }

  // 上传聊天图片
  uploadImage(file: File): Observable<UploadProgress> {
    const formData = new FormData();
    formData.append('image', file);

    return this.uploadWithProgress(`${this.API_URL}/image`, formData);
  }

  // 上传文件
  uploadFile(file: File): Observable<UploadProgress> {
    const formData = new FormData();
    formData.append('file', file);

    return this.uploadWithProgress(`${this.API_URL}/file`, formData);
  }

  // 上传多个文件
  uploadFiles(files: File[]): Observable<UploadProgress> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    return this.uploadWithProgress(`${this.API_URL}/files`, formData);
  }

  // 通用上传方法（带进度）
  private uploadWithProgress(url: string, formData: FormData): Observable<UploadProgress> {
    const req = new HttpRequest('POST', url, formData, {
      reportProgress: true,
      responseType: 'json'
    });

    return this.http.request<UploadResponse>(req).pipe(
      map((event: HttpEvent<UploadResponse>) => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            const progress = event.total ? Math.round(100 * event.loaded / event.total) : 0;
            return {
              progress,
              status: 'uploading' as const
            };

          case HttpEventType.Response:
            return {
              progress: 100,
              status: 'completed' as const,
              response: event.body!
            };

          default:
            return {
              progress: 0,
              status: 'uploading' as const
            };
        }
      })
    );
  }

  // 删除文件
  deleteFile(filename: string, type: 'files' | 'images' | 'avatars' = 'files'): Observable<any> {
    return this.http.delete(`${this.API_URL}/file/${filename}?type=${type}`);
  }

  // 获取文件信息
  getFileInfo(filename: string, type: 'files' | 'images' | 'avatars' = 'files'): Observable<any> {
    return this.http.get(`${this.API_URL}/file/${filename}?type=${type}`);
  }

  // 文件类型验证
  isValidImageFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    return validTypes.includes(file.type);
  }

  isValidAvatarFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    return validTypes.includes(file.type) && file.size <= maxSize;
  }

  // 获取文件大小的人类可读格式
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 图片预览
  createImagePreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}