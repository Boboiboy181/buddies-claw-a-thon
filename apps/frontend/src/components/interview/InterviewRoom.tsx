import { useCallback, useEffect, useRef, useState } from 'react';
import Daily, { type DailyCall } from '@daily-co/daily-js';
import { Room as LivekitRoom, Track } from 'livekit-client';
import {
  Bot,
  CheckCircle2,
  CircleStop,
  Clock3,
  Loader2,
  MessageSquareText,
  Mic,
  RotateCcw,
  Video,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { AudioRecorder } from '@/lib/audioRecorder';
import { useInterviewSocket } from '@/lib/socket';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
  const closingRef = useRef(false);
  const closingFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      // The backend advances automatically once the answer is saved; the next
      // question / follow-up arrives over the socket (agent_speak). No second call.
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

  // Candidate asks the agent to repeat the current question. Discards the
  // in-progress recording; the answer timer restarts after the replay (no penalty).
  const repeatQuestion = useCallback(async () => {
    if (submittingRef.current) return;
    const recorder = recorderRef.current;
    try {
      if (recorder?.isRecording) await recorder.stop();
    } catch {
      /* nothing recorded yet */
    }
    setPhase('agent_speaking');
    setAgentText('Đang phát lại câu hỏi...');
    try {
      await orchestrate('repeat-question');
    } catch {
      toast.error('Không phát lại được câu hỏi. Vui lòng thử lại.');
      try {
        recorder?.start();
        recordStartRef.current = Date.now();
        setElapsed(0);
        setPhase('listening');
      } catch {
        setPhase('failed');
      }
    }
  }, [orchestrate]);

  const handleAgentSpeak = useCallback(
    (e: AgentSpeakEvent) => {
      setPhase('agent_speaking');
      setAgentText(e.text);
      if (e.type === 'closing') closingRef.current = true;
      if (e.questionId) {
        currentQuestionIdRef.current = e.questionId;
        const nextQuestionIndex = interview.questions.findIndex((q) => q.id === e.questionId);
        if (nextQuestionIndex >= 0) setQuestionIndex(nextQuestionIndex);
      }
      const audio = audioRef.current;
      if (!audio) return;
      audio.src = e.audioData
        ? `data:audio/${e.audioData.startsWith('UklGR') ? 'wav' : 'mpeg'};base64,${e.audioData}`
        : e.audioUrl;
      audio.dataset.speakType = e.type;
      audio.play().catch(() => {
        // Autoplay blocked — let the candidate tap to play
        toast('Nhấn vào nút loa để nghe câu hỏi', { icon: '🔊' });
      });
    },
    [interview.questions],
  );

  const handleAudioEnded = useCallback(async () => {
    const type = audioRef.current?.dataset.speakType;
    socket.emitAudioEnded(type ?? 'question');
    // Closing message finished — leave the room (the report is already queued server-side).
    if (type === 'closing') {
      if (closingFallbackRef.current) clearTimeout(closingFallbackRef.current);
      onCompleted();
      return;
    }
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
  }, [orchestrate, onCompleted]);

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
    onInterviewCompleted: () => {
      // Wait for the closing message to finish before leaving; if it never plays
      // (e.g. autoplay blocked), fall back after a short delay so we don't hang.
      if (closingRef.current) {
        closingFallbackRef.current = setTimeout(onCompleted, 20000);
      } else {
        onCompleted();
      }
    },
    onError: ({ message }) => toast.error(message),
  });

  // Mount: mic recorder + video (LiveKit/Daily room if available, else local preview) + kick off the agent
  useEffect(() => {
    const recorder = new AudioRecorder();
    recorderRef.current = recorder;
    let videoStream: MediaStream | null = null;
    let dailyCall: DailyCall | null = null;
    let livekitRoom: LivekitRoom | null = null;
    let rafId = 0;

    // Join the video room so the candidate's video/audio gets cloud-recorded.
    // Falls back to a local-only camera preview when no provider is configured.
    const startVideo = async () => {
      try {
        const { data } = await api.post(`/orchestrator/interviews/${interview.id}/join-room`);
        if (!data?.roomUrl || !data?.candidateToken || data.candidateToken === 'mock-token') {
          throw new Error('Video provider not configured');
        }
        if (data.provider === 'livekit') {
          livekitRoom = new LivekitRoom();
          await livekitRoom.connect(data.roomUrl, data.candidateToken);
          await livekitRoom.localParticipant.enableCameraAndMicrophone();
          const camPub = livekitRoom.localParticipant.getTrackPublication(Track.Source.Camera);
          const track = camPub?.track;
          if (track && videoRef.current) track.attach(videoRef.current);
        } else {
          dailyCall = Daily.createCallObject();
          dailyCall.on('track-started', (e) => {
            if (e.participant?.local && e.track.kind === 'video' && videoRef.current) {
              videoRef.current.srcObject = new MediaStream([e.track]);
            }
          });
          await dailyCall.join({ url: data.roomUrl, token: data.candidateToken });
        }
      } catch {
        if (dailyCall) {
          dailyCall.destroy().catch(() => undefined);
          dailyCall = null;
        }
        if (livekitRoom) {
          livekitRoom.disconnect().catch(() => undefined);
          livekitRoom = null;
        }
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = videoStream;
      }
    };

    (async () => {
      try {
        await recorder.init();
        await startVideo();
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
        // The server decides what to play based on the interview's actual state:
        // greeting for a fresh start, or a replay of the current question when the
        // candidate reloaded mid-interview. Idempotent, so a reload resumes cleanly.
        await orchestrate('resume');
      } catch {
        setPhase('failed');
        setAgentText('Không bắt đầu được phỏng vấn. Vui lòng tải lại trang.');
      }
    })();

    return () => {
      cancelAnimationFrame(rafId);
      if (closingFallbackRef.current) clearTimeout(closingFallbackRef.current);
      recorder.destroy();
      videoStream?.getTracks().forEach((t) => t.stop());
      if (dailyCall) {
        dailyCall.leave().then(() => dailyCall?.destroy()).catch(() => undefined);
      }
      livekitRoom?.disconnect().catch(() => undefined);
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
  const visibleQuestions =
    questionIndex !== null ? interview.questions.slice(0, questionIndex + 1) : [];
  const completedQuestionCount =
    questionIndex !== null && phase !== 'agent_speaking' && phase !== 'listening'
      ? Math.min(questionIndex + 1, totalQuestions)
      : Math.max(0, visibleQuestions.length - 1);
  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const phaseLabel =
    phase === 'agent_speaking'
      ? 'Trợ lý đang nói'
      : phase === 'listening'
        ? 'Đang ghi âm'
        : phase === 'processing'
          ? 'Đang xử lý'
          : phase === 'waiting'
            ? 'Đang hoàn tất'
            : phase === 'failed'
              ? 'Có sự cố'
              : 'Đang kết nối';

  return (
    <div className="grid h-full w-full gap-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
      {/* ── Main video panel ── */}
      <main className="flex min-h-0 flex-col overflow-hidden rounded-2xl shadow-2xl shadow-black/60 ring-1 ring-white/8">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 px-5 py-3.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{interview.job.title}</p>
            <p className="truncate text-xs text-slate-400">{interview.candidate.fullName}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-indigo-500/15 px-3 py-1.5 ring-1 ring-indigo-500/30">
            <span className="size-1.5 rounded-full bg-indigo-400" />
            <span className="text-xs font-semibold text-indigo-300">{progressLabel}</span>
          </div>
        </div>

        {/* Video area */}
        <div className="relative flex min-h-0 flex-1 items-center bg-black">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="aspect-video max-h-full w-full object-cover"
          />

          {/* Top status badges */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
            <div className="flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md ring-1 ring-white/10">
              <span className="size-2 animate-pulse rounded-full bg-red-500" />
              <Video className="size-3" />
              Camera đang ghi
            </div>
            <div
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-md ring-1 transition-all duration-300',
                phase === 'listening'
                  ? 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30'
                  : phase === 'agent_speaking'
                    ? 'bg-indigo-500/20 text-indigo-300 ring-indigo-500/30'
                    : 'bg-black/55 text-white/75 ring-white/10',
              )}
            >
              {phaseLabel}
            </div>
          </div>

          {/* Bottom agent text overlay */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-6 pb-6 pt-24">
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
              {/* Status pill */}
              <div
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium backdrop-blur-sm ring-1 transition-all duration-300',
                  phase === 'agent_speaking'
                    ? 'bg-indigo-500/25 text-indigo-200 ring-indigo-400/30'
                    : phase === 'listening'
                      ? 'bg-emerald-500/25 text-emerald-200 ring-emerald-400/30'
                      : 'bg-white/10 text-white/70 ring-white/15',
                )}
              >
                {phase === 'processing' || phase === 'connecting' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : phase === 'listening' ? (
                  <Mic className="size-4" />
                ) : (
                  <Bot className="size-4" />
                )}
                {phaseLabel}
              </div>

              <p className="text-balance text-lg font-semibold leading-relaxed text-white drop-shadow-lg sm:text-xl md:text-2xl md:leading-10">
                {agentText}
              </p>
            </div>
          </div>
        </div>

        {/* Control bar */}
        <div className="bg-slate-900 px-5 py-4">
          {phase === 'listening' ? (
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
              {/* Timer + waveform */}
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-2 text-sm font-semibold tabular-nums text-emerald-400">
                  <span className="size-2 animate-pulse rounded-full bg-red-500" />
                  {formatTime(elapsed)}
                  {maxDurationRef.current && (
                    <span className="font-normal text-white/35">/ {formatTime(maxDurationRef.current)}</span>
                  )}
                </div>

                {/* Animated waveform bars */}
                <div className="flex h-7 items-end gap-[3px]">
                  {Array.from({ length: 18 }).map((_, i) => {
                    const wave = Math.abs(Math.sin(i * 0.85)) * 0.55 + 0.45;
                    const heightPx = Math.max(3, Math.min(28, micLevel * 220 * wave));
                    return (
                      <div
                        key={i}
                        className="w-[3px] rounded-full bg-emerald-400"
                        style={{ height: `${heightPx}px`, transition: 'height 80ms ease' }}
                      />
                    );
                  })}
                </div>

                <span className="text-xs text-white/35">Đang ghi âm</span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  className="h-11 rounded-full border border-white/10 bg-white/5 px-5 text-white/75 hover:bg-white/10 hover:text-white"
                  onClick={() => void repeatQuestion()}
                >
                  <RotateCcw className="mr-2 size-4" />
                  Nghe lại câu hỏi
                </Button>
                <Button
                  size="lg"
                  className="h-11 rounded-full bg-indigo-600 px-6 font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500"
                  onClick={() => void submitAnswer()}
                >
                  <CircleStop className="mr-2 size-4" />
                  Trả lời xong
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[56px] items-center justify-center">
              {phase === 'connecting' && <Loader2 className="animate-spin text-white/30" />}
              {phase === 'agent_speaking' && (
                <div className="flex items-center gap-3 text-sm text-white/45">
                  {/* Animated speaking bars */}
                  <div className="flex h-4 items-end gap-[3px]">
                    {[0.6, 1, 0.75, 1, 0.6].map((h, i) => (
                      <div
                        key={i}
                        className="w-[3px] animate-pulse rounded-full bg-indigo-400"
                        style={{ height: `${h * 100}%`, animationDelay: `${i * 120}ms` }}
                      />
                    ))}
                  </div>
                  Trợ lý đang nói, bạn sẽ trả lời sau khi audio kết thúc...
                </div>
              )}
              {phase !== 'agent_speaking' && phase !== 'connecting' && (
                <span className="text-sm text-white/35">{phaseLabel}</span>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Question sidebar ── */}
      <aside className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl bg-slate-900 text-white shadow-2xl shadow-black/40 ring-1 ring-white/8 lg:min-h-0">
        {/* Sidebar header */}
        <div className="bg-gradient-to-br from-indigo-600/15 via-slate-900 to-slate-900 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white">Câu hỏi phỏng vấn</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {visibleQuestions.length}/{totalQuestions} câu đã xuất hiện
              </p>
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/25">
              <MessageSquareText className="size-4" />
            </div>
          </div>
        </div>

        {/* Questions list */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {visibleQuestions.length ? (
            <ol className="flex flex-col gap-2.5">
              {visibleQuestions.map((question, index) => {
                const isCurrent = index === questionIndex;
                const isCompleted = index < completedQuestionCount;
                return (
                  <li
                    key={question.id}
                    className={cn(
                      'rounded-xl border p-4 transition-all duration-300',
                      isCurrent
                        ? 'border-indigo-500/40 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                        : 'border-white/5 bg-white/[0.03]',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Number / check badge */}
                      <div
                        className={cn(
                          'flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all duration-300',
                          isCurrent
                            ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/40'
                            : isCompleted
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-white/8 text-white/40',
                        )}
                      >
                        {isCompleted && !isCurrent ? (
                          <CheckCircle2 className="size-4" />
                        ) : (
                          index + 1
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                              isCurrent
                                ? 'bg-indigo-500/20 text-indigo-300'
                                : isCompleted
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : 'bg-white/8 text-white/40',
                            )}
                          >
                            {isCurrent ? 'Đang hỏi' : isCompleted ? 'Đã trả lời' : 'Đã hỏi'}
                          </span>
                          {question.maxDurationSeconds && (
                            <span className="inline-flex items-center gap-1 text-xs text-white/30">
                              <Clock3 className="size-3" />
                              {formatTime(question.maxDurationSeconds)}
                            </span>
                          )}
                        </div>
                        <p
                          className={cn(
                            'text-sm leading-relaxed transition-colors duration-300',
                            isCurrent ? 'text-white/95' : 'text-white/55',
                          )}
                        >
                          {question.text}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/8">
                <MessageSquareText className="size-5 text-white/25" />
              </div>
              <p className="text-sm text-white/40">Câu hỏi sẽ xuất hiện khi trợ lý bắt đầu.</p>
            </div>
          )}
        </div>

        {/* Sidebar footer */}
        <div className="border-t border-white/5 px-5 py-3.5">
          <div className="flex items-center justify-between text-xs text-white/30">
            <span>{totalQuestions - visibleQuestions.length} câu đang chờ</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3" />
              Tự động cập nhật
            </span>
          </div>
        </div>
      </aside>

      <audio ref={audioRef} onEnded={() => void handleAudioEnded()} className="hidden" />
    </div>
  );
}
