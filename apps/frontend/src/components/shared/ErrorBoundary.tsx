import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="max-w-md space-y-4 text-center">
            <h1 className="font-heading text-2xl font-semibold">Đã có lỗi xảy ra</h1>
            <p className="text-sm text-muted-foreground">
              Giao diện gặp sự cố không mong muốn. Hãy tải lại trang; nếu lỗi lặp lại vui lòng liên hệ
              quản trị viên.
            </p>
            <Button onClick={() => window.location.reload()}>Tải lại trang</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
