// F1: WebSocket hook for real-time updates + polling-based action queue
import { useEffect, useRef, useCallback, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { notificationsWsAPI } from '../lib/api';

type WSMessage = {
  type: string;
  payload: Record<string, unknown>;
};

type WSStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface ActionQueueItem {
  id: string;
  participant_id: string;
  action_type: string;
  title: string;
  description: string;
  entity_type: string;
  entity_id: string;
  priority: string;
  status: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
}

export function useWebSocket(channel?: string) {
  const toast = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const pollTimer = useRef<ReturnType<typeof setInterval>>();
  const [status, setStatus] = useState<WSStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const listenersRef = useRef<Map<string, Set<(payload: Record<string, unknown>) => void>>>(new Map());

  // Action queue + KPI state (polling-based)
  const [actionQueue, setActionQueue] = useState<ActionQueueItem[]>([]);
  const [kpis, setKpis] = useState<Record<string, unknown>>({});
  const [unreadCount, setUnreadCount] = useState(0);
  const lastPollRef = useRef<string>(new Date(Date.now() - 60000).toISOString());

  const pollNotifications = useCallback(async () => {
    try {
      const res = await notificationsWsAPI.poll(lastPollRef.current);
      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        if (data.action_queue) setActionQueue(data.action_queue);
        if (data.kpis) setKpis(data.kpis);
        if (data.notifications) setUnreadCount(data.notifications.filter((n: Record<string, unknown>) => !n.read).length);
        lastPollRef.current = data.timestamp || new Date().toISOString();
      }
    } catch {
      // Silently fail — will retry on next poll
    }
  }, []);

  const completeAction = useCallback(async (id: string) => {
    try {
      await notificationsWsAPI.completeAction(id);
      setActionQueue(prev => prev.filter(item => item.id !== id));
    } catch { /* will sync on next poll */ }
  }, []);

  const dismissAction = useCallback(async (id: string) => {
    try {
      await notificationsWsAPI.dismissAction(id);
      setActionQueue(prev => prev.filter(item => item.id !== id));
    } catch { /* will sync on next poll */ }
  }, []);

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

          // Handle action queue updates from WS
          if (msg.type === 'action_queue_update' && msg.payload?.items) {
            setActionQueue(msg.payload.items as ActionQueueItem[]);
          }
          if (msg.type === 'kpi_update' && msg.payload) {
            setKpis(msg.payload);
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
    if (pollTimer.current) clearInterval(pollTimer.current);
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
    // Start polling for action queue + KPIs (complement to WS)
    pollNotifications();
    pollTimer.current = setInterval(pollNotifications, 15000);
    return disconnect;
  }, [connect, disconnect, pollNotifications]);

  return {
    status, lastMessage, send, subscribe, connect, disconnect,
    // Action queue + KPI state
    actionQueue, kpis, unreadCount, completeAction, dismissAction,
    refreshNotifications: pollNotifications,
  };
}
