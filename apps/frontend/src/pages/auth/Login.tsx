import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm<{ email: string; password: string }>();

  const onSubmit = async (data: { email: string; password: string }) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', data);
      setAuth(res.data.token, res.data.user);
      navigate('/hr/dashboard');
    } catch {
      toast.error('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.25),_transparent_30%),linear-gradient(180deg,_#fff7ed_0%,_#f8fafc_50%,_#ffffff_100%)] px-4 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="hidden lg:block">
          <div className="max-w-xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-sm text-muted-foreground backdrop-blur">
              <ShieldCheck className="size-4 text-primary" />
              Secure access for HR operators
            </span>
            <div className="space-y-3">
              <h1 className="font-heading text-5xl font-semibold tracking-tight text-balance">
                Run structured hiring with a calmer control room.
              </h1>
              <p className="text-muted-foreground max-w-lg text-lg leading-8">
                Manage jobs, launch AI interviews, and review candidate signal in one polished workflow.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                'Reusable job templates and question sets',
                'Interview links generated in a few clicks',
                'Structured review summaries for recruiters',
                'A unified dashboard for live pipeline health',
              ].map((item) => (
                <div key={item} className="rounded-2xl border bg-background/80 p-4 backdrop-blur">
                  <p className="text-sm font-medium leading-6">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Card className="mx-auto w-full max-w-md border">
          <CardHeader className="space-y-3 pb-2">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" />
            </div>
            <div className="space-y-1">
              <CardTitle className="font-heading text-2xl">HR Interview Platform</CardTitle>
              <CardDescription>Sign in to access the interview operations workspace.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email', { required: true })}
                  placeholder="hr@company.com"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password', { required: true })}
                  placeholder="••••••••"
                  className="h-11 rounded-xl"
                />
              </div>
              <Button type="submit" disabled={loading} size="lg" className="h-11 w-full rounded-xl text-sm">
                {loading ? 'Signing in...' : 'Sign in'}
                {!loading && <ArrowRight className="size-4" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
