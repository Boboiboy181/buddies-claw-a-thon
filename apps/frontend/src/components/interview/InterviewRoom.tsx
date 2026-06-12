import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, CircleStop, Loader2, Mic } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { AudioRecorder } from '@/lib/audioRecorder';
import { useInterviewSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { AgentSpeakEvent, CandidateInterviewPayload } from '@/types/api';

type RoomPhase =
  | 'connecting'
  | 'agent_speaking'
  | 'listening'
  | 'processing'
  | 'waiting'
  | 'failed';

interface Props {
  interview: CandidateInterviewPayload;
  onCompleted: () => void;
}

export function InterviewRoom({ interview, onCompleted }: Props) {
  const [phase, setPhase] = useState<RoomPhase>('connecting');
  const [agentText, setAgentText] = useState('Đang kết nối với trợ lý phỏng vấn...');
  const [questionIndex, setQuestionIndex] = useState<number | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const currentQuestionIdRef = useRef<string | null>(null);
  const recordStartRef = useRef(0);
  const maxDurationRef = useRef<number | undefined>(undefined);
  const submittingRef = useRef(false);
  const startedRef = useRef(false);

  const orchestrate = useCallback(
    (action: string, params?: Record<string, unknown>) =>
      api.post(`/orchestrator/interviews/${interview.id}/${action}`, params),
    [interview.id],
  );

  const submitAnswer = useCallback(async () => {
    const recorder = recorderRef.current;
    const questionId = currentQuestionIdRef.current;
    if (!recorder || !questionId || submittingRef.current || !recorder.isRecording) return;
    submittingRef.current = true;
    setPhase('processing');
    setAgentText('Đang xử lý câu trả lời của bạn...');
    try {
      const blob = await recorder.stop();
      const durationSeconds = Math.round((Date.now() - recordStartRef.current) / 1000);
      const form = new FormData();
      const ext = recorder.mimeType.includes('wav') ? 'wav' : 'webm';
      form.append('audio', blob, `answer.${ext}`);
      form.append('questionId', questionId);
      form.append('durationSeconds', String(durationSeconds));
      await api.post(`/orchestrator/interviews/${interview.id}/process-answer`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      socket.emitAnswerSubmitted(questionId);
      await orchestrate('advance');
    } catch {
      toast.error('Gửi câu trả lời thất bại. Vui lòng thử lại.');
      setPhase('listening');
      // restart recording so the candidate can answer again
      try {
        recorderRef.current?.start();
        recordStartRef.current = Date.now();
      } catch {
        setPhase('failed');
      }
    } finally {
      submittingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview.id, orchestrate]);

  const handleAgentSpeak = useCallback((e: AgentSpeakEvent) => {
    setPhase('agent_speaking');
    setAgentText(e.text);
    if (e.questionId) currentQuestionIdRef.current = e.questionId;
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = e.audioUrl;
    audio.dataset.speakType = e.type;
    audio.play().catch(() => {
      // Autoplay blocked — let the candidate tap to play
      toast('Nhấn vào nút loa để nghe câu hỏi', { icon: '🔊' });
    });
  }, []);

  const handleAudioEnded = useCallback(async () => {
    const type = audioRef.current?.dataset.speakType;
    socket.emitAudioEnded(type ?? 'question');
    try {
      if (type === 'greeting') {
        await orchestrate(`next-question?index=0`);
      } else if (currentQuestionIdRef.current) {
        await orchestrate('start-listening', { questionId: currentQuestionIdRef.current });
      }
    } catch {
      toast.error('Mất kết nối với máy chủ. Vui lòng tải lại trang.');
      setPhase('failed');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orchestrate]);

  const socket = useInterviewSocket(interview.id, {
    onAgentSpeak: handleAgentSpeak,
    onStartListening: ({ questionId, maxDurationSeconds }) => {
      currentQuestionIdRef.current = questionId;
      maxDurationRef.current = maxDurationSeconds;
      try {
        recorderRef.current?.start();
        recordStartRef.current = Date.now();
        setElapsed(0);
        setPhase('listening');
      } catch {
        setPhase('failed');
        setAgentText('Không khởi động được micro. Vui lòng tải lại trang và cấp quyền.');
      }
    },
    onStateChanged: (e) => {
      if (typeof e.questionIndex === 'number') setQuestionIndex(e.questionIndex);
      if (e.state === 'FAILED') {
        setPhase('failed');
        setAgentText('Buổi phỏng vấn gặp sự cố. HR sẽ liên hệ lại với bạn.');
      }
      if (e.state === 'REPORT_GENERATING' || e.state === 'COMPLETED') setPhase('waiting');
    },
    onInterviewCompleted: onCompleted,
    onError: ({ message }) => toast.error(message),
  });

  // Mount: mic recorder + self camera + kick off the agent
  useEffect(() => {
    const recorder = new AudioRecorder();
    recorderRef.current = recorder;
    let videoStream: MediaStream | null = null;
    let rafId = 0;

    (async () => {
      try {
        await recorder.init();
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = videoStream;
      } catch {
        setPhase('failed');
        setAgentText('Không truy cập được camera/micro.');
        return;
      }

      const meter = () => {
        setMicLevel(recorder.getLevel());
        rafId = requestAnimationFrame(meter);
      };
      meter();

      if (startedRef.current) return;
      startedRef.current = true;
      socket.emitCandidateJoined();
      try {
        if (interview.state === 'READY_CHECK' || interview.state === 'CONSENT_PENDING' || interview.state === 'INIT') {
          await orchestrate('start-greeting');
        } else {
          // Rejoin mid-interview: replay the current question
          await orchestrate(`next-question?index=${interview.currentQuestionIndex ?? 0}`);
        }
      } catch {
        setPhase('failed');
        setAgentText('Không bắt đầu được phỏng vấn. Vui lòng tải lại trang.');
      }
    })();

    return () => {
      cancelAnimationFrame(rafId);
      recorder.destroy();
      videoStream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview.id]);

  // Recording timer + auto-submit at max duration
  useEffect(() => {
    if (phase !== 'listening') return;
    const interval = setInterval(() => {
      const seconds = Math.round((Date.now() - recordStartRef.current) / 1000);
      setElapsed(seconds);
      const max = maxDurationRef.current;
      if (max && seconds >= max) void submitAnswer();
    }, 500);
    return () => clearInterval(interval);
  }, [phase, submitAnswer]);

  const totalQuestions = interview.questions.length;
  const progressLabel =
    questionIndex !== null ? `Câu ${questionIndex + 1}/${totalQuestions}` : 'Lời chào';
  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="grid w-full gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* Agent panel */}
      <Card className="border-border/80 shadow-lg shadow-slate-950/5">
        <CardContent className="flex min-h-[420px] flex-col items-center justify-center gap-6 p-6 text-center md:p-8">
          <div className="flex items-center gap-2 self-start rounded-full border bg-muted/45 px-3 py-1 text-xs text-muted-foreground">
            {progressLabel}
          </div>

          <div
            className={`flex size-24 items-center justify-center rounded-full transition-colors ${
              phase === 'agent_speaking'
                ? 'animate-pulse bg-primary text-primary-foreground'
                : phase === 'listening'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {phase === 'processing' ? (
              <Loader2 className="size-10 animate-spin" />
            ) : phase === 'listening' ? (
              <Mic className="size-10" />
            ) : (
              <Bot className="size-10" />
            )}
          </div>

          <p className="max-w-lg text-lg leading-8 text-foreground">{agentText}</p>

          {phase === 'listening' && (
            <div className="flex w-full max-w-sm flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <span className="size-2 animate-pulse rounded-full bg-red-500" />
                Đang ghi âm — {formatTime(elapsed)}
                {maxDurationRef.current ? ` / tối đa ${formatTime(maxDurationRef.current)}` : ''}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-[width] duration-75"
                  style={{ width: `${Math.min(100, micLevel * 250)}%` }}
                />
              </div>
              <Button
                size="lg"
                className="h-11 rounded-lg px-6"
                onClick={() => void submitAnswer()}
              >
                <CircleStop data-icon="inline-start" />
                Trả lời xong
              </Button>
            </div>
          )}

          {phase === 'agent_speaking' && (
            <p className="text-xs text-muted-foreground">Trợ lý đang nói, bạn sẽ trả lời sau khi audio kết thúc...</p>
          )}
          {phase === 'connecting' && <Loader2 className="animate-spin text-muted-foreground" />}
        </CardContent>
      </Card>

      {/* Self view */}
      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-lg border bg-slate-950 shadow-sm">
          <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Camera của bạn — buổi phỏng vấn đang được ghi lại
        </p>
      </div>

      <audio ref={audioRef} onEnded={() => void handleAudioEnded()} className="hidden" />
    </div>
  );
}
