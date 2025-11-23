import { useEffect, useState, useRef, useCallback, useMemo } from 'react';

interface SensorData {
  id: number;
  sensor_id: string;
  value: number;
  timestamp: string;
  metadata: Record<string, any>;
}

interface UseWebSocketOptions {
  url: string;
  onMessage?: (data: SensorData) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  reconnect?: boolean;
  reconnectInterval?: number;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    url,
    onMessage,
    onError,
    onOpen,
    onClose,
    reconnect = true,
    reconnectInterval = 3000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [latestData, setLatestData] = useState<SensorData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Store callbacks in refs to avoid recreating connection
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
  }, [onMessage, onError, onOpen, onClose]);

  useEffect(() => {
    // Determine WebSocket URL based on environment
    const wsUrl = url.startsWith('ws://') || url.startsWith('wss://')
      ? url
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${url}`;

    let shouldReconnect = reconnect;
    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsConnected(true);
          setError(null);
          reconnectAttemptsRef.current = 0; // Reset on successful connection
          onOpenRef.current?.();
        };

        ws.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            const sensorData: SensorData = parsed.data || parsed;
            setLatestData(sensorData);
            onMessageRef.current?.(sensorData);
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        ws.onerror = (event) => {
          setError('WebSocket error occurred');
          onErrorRef.current?.(event);
        };

        ws.onclose = (event) => {
          setIsConnected(false);
          onCloseRef.current?.();

          // Don't reconnect if:
          // 1. It was a normal closure (code 1000) - user/component intentionally closed
          // 2. We've exceeded max attempts
          // 3. Reconnect is disabled or component is unmounting
          if (event.code === 1000 || !shouldReconnect) {
            return;
          }

          if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            setError('Max reconnection attempts reached. Please refresh the page.');
            return;
          }

          // Only reconnect on abnormal closures with a delay
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            if (shouldReconnect) {
              console.log(`Reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
              connect();
            }
          }, reconnectInterval);
        };

        wsRef.current = ws;
      } catch (err) {
        setError('Failed to create WebSocket connection');
        console.error('WebSocket connection error:', err);
      }
    };

    connect();

    return () => {
      // Disable reconnection on cleanup
      shouldReconnect = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        // Close with normal code to prevent reconnection
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }
    };
    // Only depend on url and reconnect setting - callbacks are handled via refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, reconnect]);

  // Memoize send function to prevent unnecessary re-renders
  const send = useCallback((data: string | object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }, []);

  // Memoize return object to prevent unnecessary re-renders in consuming components
  return useMemo(() => ({
    isConnected,
    latestData,
    error,
    send,
  }), [isConnected, latestData, error, send]);
}

