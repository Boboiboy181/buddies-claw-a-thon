import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
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
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="hidden lg:block">
          <div className="rounded-lg border bg-card p-8 shadow-sm">
            <div className="flex max-w-xl flex-col gap-6">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-sm text-muted-foreground">
                <ShieldCheck className="text-primary" />
                Secure access for HR operators
              </span>
              <div className="flex flex-col gap-3">
                <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance">
                  Structured interviews, one calm hiring workspace.
                </h1>
                <p className="max-w-lg text-base leading-7 text-muted-foreground">
                  Manage jobs, launch AI interviews, and review candidate signal without losing the operational thread.
                </p>
              </div>
              <div className="grid gap-3">
                {[
                  'Reusable role briefs and question sets',
                  'Interview links generated in a few clicks',
                  'Structured review summaries for recruiters',
                  'A dashboard for live pipeline health',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3">
                    <CheckCircle2 className="text-primary" />
                    <p className="text-sm font-medium leading-6">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Card className="mx-auto w-full max-w-md border-border/80 shadow-lg shadow-slate-950/5">
          <CardHeader className="gap-3 pb-2">
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/20">
              <ShieldCheck />
            </div>
            <div className="flex flex-col gap-1">
              <CardTitle className="font-heading text-2xl">HR Interview Platform</CardTitle>
              <CardDescription>Sign in to access the interview operations workspace.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email', { required: true })}
                  placeholder="hr@company.com"
                  className="h-11 rounded-lg"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password', { required: true })}
                  placeholder="Password"
                  className="h-11 rounded-lg"
                />
              </div>
              <Button type="submit" disabled={loading} size="lg" className="h-11 w-full rounded-lg text-sm">
                {loading ? 'Signing in...' : 'Sign in'}
                {!loading && <ArrowRight data-icon="inline-end" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
