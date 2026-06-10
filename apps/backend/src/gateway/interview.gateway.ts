import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class InterviewGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(InterviewGateway.name);
  private interviewRooms = new Map<string, string[]>(); // interviewId -> socketIds

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_interview')
  handleJoinInterview(@MessageBody() data: { interviewId: string }, @ConnectedSocket() client: Socket) {
    client.join(`interview:${data.interviewId}`);
    this.logger.log(`Client ${client.id} joined interview ${data.interviewId}`);
    return { joined: true };
  }

  @SubscribeMessage('candidate_joined')
  handleCandidateJoined(@MessageBody() data: { interviewId: string }, @ConnectedSocket() client: Socket) {
    this.server.to(`interview:${data.interviewId}`).emit('candidate_joined', data);
  }

  @SubscribeMessage('agent_audio_ended')
  handleAgentAudioEnded(@MessageBody() data: { interviewId: string; type: string }) {
    this.server.to(`interview:${data.interviewId}`).emit('agent_audio_ended', data);
  }

  @SubscribeMessage('answer_submitted')
  handleAnswerSubmitted(@MessageBody() data: { interviewId: string; questionId: string }) {
    this.server.to(`interview:${data.interviewId}`).emit('answer_submitted', data);
  }

  @SubscribeMessage('interview_finished')
  handleInterviewFinished(@MessageBody() data: { interviewId: string }) {
    this.server.to(`interview:${data.interviewId}`).emit('interview_finished', data);
  }

  // Called by backend services to push state changes to frontend
  emitStateChange(interviewId: string, state: string, extra?: any) {
    this.server.to(`interview:${interviewId}`).emit('interview_state_changed', { state, ...extra });
  }

  emitAgentSpeak(interviewId: string, payload: { type: string; text: string; audioUrl: string; questionId?: string }) {
    this.server.to(`interview:${interviewId}`).emit('agent_speak', payload);
  }

  emitStartListening(interviewId: string, questionId: string) {
    this.server.to(`interview:${interviewId}`).emit('start_listening', { questionId });
  }

  emitInterviewCompleted(interviewId: string) {
    this.server.to(`interview:${interviewId}`).emit('interview_completed', { interviewId });
  }

  emitError(interviewId: string, message: string) {
    this.server.to(`interview:${interviewId}`).emit('error', { message });
  }
}
