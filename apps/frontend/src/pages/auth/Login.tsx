import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowRight, Check, CheckCircle2, Copy, Eye, EyeOff, KeyRound, ShieldCheck, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DEMO_CREDENTIALS = { email: 'hr@demo.com', password: 'demo1234' };

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<'email' | 'password' | null>(null);
  const { register, handleSubmit, setValue } = useForm<{ email: string; password: string }>({
    defaultValues: DEMO_CREDENTIALS,
  });

  const copyToClipboard = async (field: 'email' | 'password', value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);
      setTimeout(() => setCopied((c) => (c === field ? null : c)), 1500);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const fillCredentials = () => {
    setValue('email', DEMO_CREDENTIALS.email, { shouldValidate: true });
    setValue('password', DEMO_CREDENTIALS.password, { shouldValidate: true });
    toast.success('Demo credentials filled');
  };

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
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password', { required: true })}
                    placeholder="Password"
                    className="h-11 rounded-lg pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading} size="lg" className="h-11 w-full rounded-lg text-sm">
                {loading ? 'Signing in...' : 'Sign in'}
                {!loading && <ArrowRight data-icon="inline-end" />}
              </Button>
            </form>

            <div className="mt-5 rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 font-medium text-foreground">
                  <KeyRound className="size-4 text-primary" />
                  Demo credentials
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fillCredentials}
                  className="h-7 gap-1.5 rounded-md px-2.5 text-xs"
                >
                  <Wand2 className="size-3.5" />
                  Fill form
                </Button>
              </div>
              <dl className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1.5 text-muted-foreground">
                {([
                  ['email', 'Email', DEMO_CREDENTIALS.email],
                  ['password', 'Password', DEMO_CREDENTIALS.password],
                ] as const).map(([field, label, value]) => (
                  <div key={field} className="contents">
                    <dt className="font-medium text-foreground">{label}</dt>
                    <dd className="truncate font-mono">{value}</dd>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(field, value)}
                      aria-label={`Copy ${label.toLowerCase()}`}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {copied === field ? (
                        <Check className="size-3.5 text-green-600" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-xs text-muted-foreground">
                Public preview — prefilled by default. Use Fill form or copy if you cleared them.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
