import React from 'react';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // 콘솔에 에러 로그 (추후 Sentry 등으로 확장 가능)
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 24px', textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#191f28', marginBottom: '8px' }}>오류가 발생했습니다</h2>
          <p style={{ fontSize: '14px', color: '#8b95a1', marginBottom: '24px', maxWidth: '320px', lineHeight: '1.5' }}>
            {this.state.error?.message || '알 수 없는 오류'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{
              padding: '14px 32px', borderRadius: '14px', border: 'none',
              background: '#3182f6', color: '#fff', fontSize: '15px', fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            다시 시도하기
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
