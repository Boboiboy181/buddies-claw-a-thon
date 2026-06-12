import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { AgentSpeakEvent, StartListeningEvent, StateChangedEvent } from '@/types/api';

export const createInterviewSocket = (interviewId: string): Socket => {
  const socket = io(import.meta.env.VITE_WS_URL || window.location.origin, {
    transports: ['websocket', 'polling'],
  });
  socket.on('connect', () => {
    socket.emit('join_interview', { interviewId });
  });
  return socket;
};

export interface InterviewSocketHandlers {
  onStateChanged?: (e: StateChangedEvent) => void;
  onAgentSpeak?: (e: AgentSpeakEvent) => void;
  onStartListening?: (e: StartListeningEvent) => void;
  onInterviewCompleted?: () => void;
  onError?: (e: { message: string }) => void;
}

/**
 * Connects on mount, joins the interview room, disconnects on unmount.
 * Handlers are kept in a ref so re-renders don't re-subscribe.
 */
export function useInterviewSocket(
  interviewId: string | undefined,
  handlers: InterviewSocketHandlers,
) {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!interviewId) return;
    const socket = createInterviewSocket(interviewId);
    socketRef.current = socket;

    socket.on('interview_state_changed', (e) => handlersRef.current.onStateChanged?.(e));
    socket.on('agent_speak', (e) => handlersRef.current.onAgentSpeak?.(e));
    socket.on('start_listening', (e) => handlersRef.current.onStartListening?.(e));
    socket.on('interview_completed', () => handlersRef.current.onInterviewCompleted?.());
    socket.on('error', (e) => handlersRef.current.onError?.(e));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [interviewId]);

  return {
    emitAudioEnded: (type: string) =>
      socketRef.current?.emit('agent_audio_ended', { interviewId, type }),
    emitAnswerSubmitted: (questionId: string) =>
      socketRef.current?.emit('answer_submitted', { interviewId, questionId }),
    emitCandidateJoined: () => socketRef.current?.emit('candidate_joined', { interviewId }),
  };
}
