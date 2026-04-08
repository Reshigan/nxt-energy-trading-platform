// F1: WebSocket hook for real-time updates
import { useEffect, useRef, useCallback, useState } from 'react';
import { useToast } from '../contexts/ToastContext';

type WSMessage = {
  type: string;
  payload: Record<string, unknown>;
};

type WSStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useWebSocket(channel?: string) {
  const toast = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const [status, setStatus] = useState<WSStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const listenersRef = useRef<Map<string, Set<(payload: Record<string, unknown>) => void>>>(new Map());

  const connect = useCallback(() => {
    const token = localStorage.getItem('nxt_token');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/api/v1/ws${channel ? `?channel=${channel}` : ''}`;

    try {
      setStatus('connecting');
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setStatus('connected');
        // Authenticate
        ws.send(JSON.stringify({ type: 'auth', payload: { token } }));
      };

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          setLastMessage(msg);

          // Notify listeners
          const handlers = listenersRef.current.get(msg.type);
          if (handlers) {
            handlers.forEach(handler => handler(msg.payload));
          }

          // Show toast for important events
          if (msg.type === 'trade_filled') {
            toast.success(`Order filled: ${(msg.payload.volume as number)?.toLocaleString()} MWh`);
          } else if (msg.type === 'settlement_due') {
            toast.info('Settlement reminder: payment due soon');
          } else if (msg.type === 'margin_warning') {
            toast.error('Margin warning: please review your positions');
          }
        } catch {
          // Non-JSON message, ignore
        }
      };

      ws.onclose = () => {
        setStatus('disconnected');
        wsRef.current = null;
        // Auto-reconnect after 5s
        reconnectTimer.current = setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        setStatus('error');
      };

      wsRef.current = ws;
    } catch {
      setStatus('error');
    }
  }, [channel, toast]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const send = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const subscribe = useCallback((type: string, handler: (payload: Record<string, unknown>) => void) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }
    listenersRef.current.get(type)!.add(handler);
    return () => {
      listenersRef.current.get(type)?.delete(handler);
    };
  }, []);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return { status, lastMessage, send, subscribe, connect, disconnect };
}
