import { useState, useEffect, useRef, useCallback } from 'react';

interface LogEntry {
  id: number;
  type: 'log' | 'warn' | 'error' | 'exception';
  message: string;
  timestamp: string;
}

const LOG_COLORS: Record<LogEntry['type'], string> = {
  log: '#e0e0e0',
  warn: '#ffd54f',
  error: '#ef5350',
  exception: '#ff1744',
};

const LOG_BADGES: Record<LogEntry['type'], string> = {
  log: 'LOG',
  warn: 'WRN',
  error: 'ERR',
  exception: '💥 EXC',
};

let logIdCounter = 0;

export function FloatingLogger() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((type: LogEntry['type'], ...args: any[]) => {
    const message = args
      .map((a) => {
        if (typeof a === 'string') return a;
        try { return JSON.stringify(a, null, 1); } catch { return String(a); }
      })
      .join(' ');

    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    setLogs((prev) => {
      const next = [...prev, { id: logIdCounter++, type, message, timestamp }];
      // 최대 200줄 유지
      return next.length > 200 ? next.slice(-200) : next;
    });
  }, []);

  useEffect(() => {
    // --- console 메서드 가로채기 ---
    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;

    console.log = (...args: any[]) => { origLog.apply(console, args); addLog('log', ...args); };
    console.warn = (...args: any[]) => { origWarn.apply(console, args); addLog('warn', ...args); };
    console.error = (...args: any[]) => { origError.apply(console, args); addLog('error', ...args); };

    // --- 전역 에러 핸들러 ---
    const handleError = (event: ErrorEvent) => {
      addLog('exception', `${event.message} (${event.filename}:${event.lineno}:${event.colno})`);
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      addLog('exception', `Unhandled Promise: ${event.reason}`);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    // 초기 로그
    addLog('log', '🛠 FloatingLogger 활성화됨');

    return () => {
      console.log = origLog;
      console.warn = origWarn;
      console.error = origError;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [addLog]);

  // 자동 스크롤
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  const clearLogs = () => setLogs([]);

  const errorCount = logs.filter((l) => l.type === 'error' || l.type === 'exception').length;

  return (
    <>
      {/* ─── 접힌 상태: 플로팅 버튼 ─── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '12px',
            zIndex: 99999,
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: 'none',
            background: errorCount > 0
              ? 'linear-gradient(135deg, #e53935, #ff1744)'
              : 'linear-gradient(135deg, #1e1e2e, #2d2d44)',
            color: '#fff',
            fontSize: '18px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          aria-label="로그 펼치기"
        >
          {errorCount > 0 ? `${errorCount}` : '📋'}
        </button>
      )}

      {/* ─── 펼친 상태: 로그 패널 ─── */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '70px',
            left: '8px',
            right: '8px',
            maxHeight: '45vh',
            zIndex: 99999,
            background: 'rgba(18, 18, 28, 0.92)',
            backdropFilter: 'blur(8px)',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "'SF Mono', 'Menlo', 'Consolas', monospace",
            fontSize: '11px',
            overflow: 'hidden',
          }}
        >
          {/* 헤더 바 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.04)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              flexShrink: 0,
            }}
          >
            <span style={{ color: '#8b95a1', fontWeight: '600', fontSize: '11px', letterSpacing: '0.5px' }}>
              🔍 DEBUG LOG ({logs.length})
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={clearLogs}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  color: '#8b95a1',
                  fontSize: '10px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                지우기
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  color: '#8b95a1',
                  fontSize: '13px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '700',
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* 로그 내용 */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '6px 10px',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {logs.length === 0 && (
              <div style={{ color: '#555', textAlign: 'center', padding: '20px 0' }}>
                아직 로그가 없습니다
              </div>
            )}
            {logs.map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: '3px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  display: 'flex',
                  gap: '6px',
                  alignItems: 'flex-start',
                  lineHeight: '1.5',
                }}
              >
                <span style={{ color: '#555', flexShrink: 0, fontSize: '10px', marginTop: '1px' }}>
                  {entry.timestamp}
                </span>
                <span
                  style={{
                    color: entry.type === 'log' ? '#6b7280' : LOG_COLORS[entry.type],
                    fontWeight: entry.type === 'log' ? '400' : '600',
                    fontSize: '9px',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    background: entry.type === 'log' ? 'transparent' : `${LOG_COLORS[entry.type]}18`,
                    flexShrink: 0,
                    marginTop: '1px',
                  }}
                >
                  {LOG_BADGES[entry.type]}
                </span>
                <span
                  style={{
                    color: LOG_COLORS[entry.type],
                    wordBreak: 'break-all',
                    whiteSpace: 'pre-wrap',
                    flex: 1,
                  }}
                >
                  {entry.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
