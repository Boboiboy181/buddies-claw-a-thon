import { useEffect, useRef, useState } from 'react';
import { Camera, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  onReady: () => void;
}

/** Camera preview + mic level meter. Streams are stopped on unmount; the
 *  interview room requests its own streams. */
export function DeviceCheck({ onReady }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [micOk, setMicOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let rafId = 0;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) videoRef.current.srcObject = stream;

        audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        audioContext.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const level = sum / data.length / 255;
          setMicLevel(level);
          if (level > 0.05) setMicOk(true);
          rafId = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setError(
          'Không truy cập được camera/micro. Vui lòng cấp quyền trong trình duyệt rồi tải lại trang.',
        );
      }
    })();

    return () => {
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
      audioContext?.close().catch(() => undefined);
    };
  }, []);

  return (
    <Card className="w-full max-w-xl border-border/80 shadow-lg shadow-slate-950/5">
      <CardHeader>
        <CardTitle className="text-2xl">Kiểm tra thiết bị</CardTitle>
        <CardDescription>Hãy chắc chắn camera và micro hoạt động trước khi bắt đầu.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border bg-slate-950">
              <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                <Mic className="text-primary" />
                Mức âm lượng micro — hãy nói thử vài từ
                {micOk && <span className="text-emerald-600">✓ Đã nhận tiếng</span>}
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-75"
                  style={{ width: `${Math.min(100, micLevel * 250)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border bg-muted/35 p-3 text-sm text-muted-foreground">
              <Camera className="text-primary" />
              Bạn thấy hình ảnh của mình ở khung trên là camera đã sẵn sàng.
            </div>
          </>
        )}

        <Button className="h-11 w-full rounded-lg" disabled={!!error || !micOk} onClick={onReady}>
          Sẵn sàng — bắt đầu phỏng vấn
        </Button>
      </CardContent>
    </Card>
  );
}
