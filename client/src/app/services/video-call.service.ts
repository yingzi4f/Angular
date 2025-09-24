import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import Peer, { DataConnection, MediaConnection } from 'peerjs';
import { io, Socket } from 'socket.io-client';

export interface CallState {
  isInCall: boolean;
  isInitiator: boolean;
  remoteUserId?: string;
  remoteUsername?: string;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  callType: 'audio' | 'video' | null;
}

export interface IncomingCall {
  callerId: string;
  callerUsername?: string;
  callType: 'audio' | 'video';
  mediaConnection: MediaConnection;
}

@Injectable({
  providedIn: 'root'
})
export class VideoCallService {
  private peer: Peer | null = null;
  private socket: Socket | null = null;
  private currentCall: MediaConnection | null = null;
  private localStream: MediaStream | null = null;

  private callStateSubject = new BehaviorSubject<CallState>({
    isInCall: false,
    isInitiator: false,
    callType: null
  });

  private incomingCallSubject = new BehaviorSubject<IncomingCall | null>(null);

  public callState$ = this.callStateSubject.asObservable();
  public incomingCall$ = this.incomingCallSubject.asObservable();

  constructor() {
    this.initializePeerConnection();
  }

  private initializePeerConnection(): void {
    // 初始化 PeerJS
    this.peer = new Peer({
      host: 'localhost',
      port: 9000,
      path: '/peerjs',
      debug: 2
    });

    this.peer.on('open', (id) => {
      console.log('PeerJS 连接已建立，ID:', id);
    });

    this.peer.on('call', (call) => {
      // 接收到来电
      console.log('接收到来电，来自:', call.peer);

      const incomingCall: IncomingCall = {
        callerId: call.peer,
        callType: 'video', // 默认为视频通话
        mediaConnection: call
      };

      this.incomingCallSubject.next(incomingCall);
    });

    this.peer.on('error', (error) => {
      console.error('PeerJS 错误:', error);
    });

    // 初始化 Socket 连接用于信令
    this.initializeSocketConnection();
  }

  private initializeSocketConnection(): void {
    this.socket = io('http://localhost:3000');

    this.socket.on('video-call-offer', (data) => {
      console.log('收到视频通话邀请:', data);
      // 处理通话邀请的逻辑可以在这里实现
    });

    this.socket.on('video-call-answer', (data) => {
      console.log('通话被接受:', data);
    });

    this.socket.on('video-call-end', () => {
      this.endCall();
    });
  }

  // 发起视频通话
  async startVideoCall(targetUserId: string, targetUsername?: string): Promise<void> {
    try {
      // 获取本地媒体流
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      if (!this.peer) {
        throw new Error('PeerJS 连接未建立');
      }

      // 发起通话
      const call = this.peer.call(targetUserId, this.localStream);
      this.currentCall = call;

      // 监听远程流
      call.on('stream', (remoteStream) => {
        console.log('接收到远程视频流');
        this.updateCallState({
          isInCall: true,
          isInitiator: true,
          remoteUserId: targetUserId,
          remoteUsername: targetUsername,
          localStream: this.localStream,
          remoteStream: remoteStream,
          callType: 'video'
        });
      });

      call.on('close', () => {
        this.endCall();
      });

      call.on('error', (error) => {
        console.error('通话错误:', error);
        this.endCall();
      });

    } catch (error) {
      console.error('发起视频通话失败:', error);
      throw error;
    }
  }

  // 发起音频通话
  async startAudioCall(targetUserId: string, targetUsername?: string): Promise<void> {
    try {
      // 获取本地音频流
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true
      });

      if (!this.peer) {
        throw new Error('PeerJS 连接未建立');
      }

      // 发起通话
      const call = this.peer.call(targetUserId, this.localStream);
      this.currentCall = call;

      // 监听远程流
      call.on('stream', (remoteStream) => {
        console.log('接收到远程音频流');
        this.updateCallState({
          isInCall: true,
          isInitiator: true,
          remoteUserId: targetUserId,
          remoteUsername: targetUsername,
          localStream: this.localStream,
          remoteStream: remoteStream,
          callType: 'audio'
        });
      });

      call.on('close', () => {
        this.endCall();
      });

    } catch (error) {
      console.error('发起音频通话失败:', error);
      throw error;
    }
  }

  // 接受来电
  async acceptCall(incomingCall: IncomingCall, withVideo: boolean = true): Promise<void> {
    try {
      // 获取本地媒体流
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: withVideo,
        audio: true
      });

      // 接听通话
      incomingCall.mediaConnection.answer(this.localStream);
      this.currentCall = incomingCall.mediaConnection;

      // 监听远程流
      incomingCall.mediaConnection.on('stream', (remoteStream) => {
        console.log('接收到远程流');
        this.updateCallState({
          isInCall: true,
          isInitiator: false,
          remoteUserId: incomingCall.callerId,
          remoteUsername: incomingCall.callerUsername,
          localStream: this.localStream,
          remoteStream: remoteStream,
          callType: withVideo ? 'video' : 'audio'
        });
      });

      incomingCall.mediaConnection.on('close', () => {
        this.endCall();
      });

      // 清除来电通知
      this.incomingCallSubject.next(null);

    } catch (error) {
      console.error('接受通话失败:', error);
      this.rejectCall();
      throw error;
    }
  }

  // 拒绝来电
  rejectCall(): void {
    const incomingCall = this.incomingCallSubject.value;
    if (incomingCall) {
      incomingCall.mediaConnection.close();
      this.incomingCallSubject.next(null);
    }
  }

  // 结束通话
  endCall(): void {
    // 关闭当前通话
    if (this.currentCall) {
      this.currentCall.close();
      this.currentCall = null;
    }

    // 停止本地媒体流
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // 更新通话状态
    this.updateCallState({
      isInCall: false,
      isInitiator: false,
      callType: null
    });

    // 清除来电通知
    this.incomingCallSubject.next(null);

    console.log('通话已结束');
  }

  // 切换摄像头开关
  toggleVideo(): void {
    const currentState = this.callStateSubject.value;
    if (currentState.localStream && currentState.callType === 'video') {
      const videoTrack = currentState.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
  }

  // 切换麦克风开关
  toggleAudio(): void {
    const currentState = this.callStateSubject.value;
    if (currentState.localStream) {
      const audioTrack = currentState.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  }

  // 获取当前的 Peer ID
  getPeerId(): string | null {
    return this.peer ? this.peer.id : null;
  }

  // 检查浏览器是否支持媒体设备
  async checkMediaSupport(): Promise<{video: boolean, audio: boolean}> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideo = devices.some(device => device.kind === 'videoinput');
      const hasAudio = devices.some(device => device.kind === 'audioinput');

      return { video: hasVideo, audio: hasAudio };
    } catch (error) {
      console.error('检查媒体设备支持失败:', error);
      return { video: false, audio: false };
    }
  }

  private updateCallState(newState: Partial<CallState>): void {
    const currentState = this.callStateSubject.value;
    this.callStateSubject.next({
      ...currentState,
      ...newState
    });
  }

  // 清理资源
  ngOnDestroy(): void {
    this.endCall();

    if (this.peer) {
      this.peer.destroy();
    }

    if (this.socket) {
      this.socket.disconnect();
    }
  }
}