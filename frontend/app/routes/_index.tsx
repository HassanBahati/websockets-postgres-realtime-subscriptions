import { useMemo, useCallback, memo } from 'react';
import { useLoaderData } from '@remix-run/react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { useWebSocket } from '~/hooks/useWebSocket';

interface SensorData {
  id: number;
  sensor_id: string;
  value: number;
  timestamp: string;
  metadata: Record<string, any>;
}

// Remix loader - fetches initial data server-side
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Use environment variable or default to localhost:8000
    // In production, set API_URL in your environment
    const apiUrl = process.env.API_URL || 'http://localhost:8000';
    
    const response = await fetch(`${apiUrl}/api/v1/sensors-readings/?limit=1`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch initial sensor data:', response.statusText);
      return { initialData: null };
    }

    const data: SensorData[] = await response.json();
    return {
      initialData: data && data.length > 0 ? data[0] : null,
    };
  } catch (error) {
    console.error('Error fetching initial sensor data:', error);
    return { initialData: null };
  }
}

// Memoized status component to prevent re-renders
// Custom comparison to only re-render when isConnected or error actually changes
const ConnectionStatusComponent = ({ isConnected, error }: { isConnected: boolean; error: string | null }) => {
  // Memoize style objects to prevent recreation
  const statusStyle = useMemo(() => ({
    padding: '1rem',
    borderRadius: '8px',
    backgroundColor: isConnected ? '#d4edda' : '#f8d7da',
    color: isConnected ? '#155724' : '#721c24',
    display: 'inline-block' as const,
    marginBottom: '1rem',
  }), [isConnected]);

  const containerStyle = useMemo(() => ({
    marginBottom: '2rem',
  }), []);

  const errorStyle = useMemo(() => ({
    color: '#dc3545',
    marginTop: '0.5rem',
  }), []);

  return (
    <div style={containerStyle}>
      <div style={statusStyle}>
        Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>
      {error && (
        <div style={errorStyle}>
          Error: {error}
        </div>
      )}
    </div>
  );
};

const areConnectionStatusEqual = (prevProps: { isConnected: boolean; error: string | null }, nextProps: { isConnected: boolean; error: string | null }) => {
  return prevProps.isConnected === nextProps.isConnected && prevProps.error === nextProps.error;
};

const ConnectionStatus = memo(ConnectionStatusComponent, areConnectionStatusEqual);

ConnectionStatus.displayName = 'ConnectionStatus';

// Data source badge component
const DataSourceBadge = memo(({ source }: { source: 'realtime' | 'cache' }) => {
  const badgeStyle = useMemo(() => ({
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 'bold' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    backgroundColor: source === 'realtime' ? '#28a745' : '#ffc107',
    color: source === 'realtime' ? '#fff' : '#000',
    marginLeft: '0.5rem',
  }), [source]);

  return (
    <span style={badgeStyle}>
      {source === 'realtime' ? '🟢 Realtime' : '📦 Cache'}
    </span>
  );
});

DataSourceBadge.displayName = 'DataSourceBadge';

// Sensor reading display component
const SensorReadingDisplayComponent = ({ data, dataSource }: { data: SensorData; dataSource: 'realtime' | 'cache' }) => {
  const formattedTimestamp = useMemo(
    () => new Date(data.timestamp).toLocaleString(),
    [data.timestamp]
  );

  // Use JSON.stringify for stable comparison of metadata object
  const metadataKey = useMemo(
    () => data.metadata ? JSON.stringify(data.metadata) : '',
    [data.metadata]
  );
  
  const hasMetadata = useMemo(
    () => metadataKey.length > 0,
    [metadataKey]
  );

  // Memoize style objects to prevent recreation on every render
  const containerStyle = useMemo(() => ({
    border: '2px solid #007bff',
    borderRadius: '8px',
    padding: '1.5rem',
    backgroundColor: '#f8f9fa',
  }), []);

  const headerStyle = useMemo(() => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
  }), []);

  const contentStyle = useMemo(() => ({
    marginTop: '1rem',
  }), []);

  const metadataContainerStyle = useMemo(() => ({
    marginTop: '1rem',
  }), []);

  const preStyle = useMemo(() => ({
    backgroundColor: '#fff',
    padding: '0.5rem',
    borderRadius: '4px',
    marginTop: '0.5rem',
  }), []);

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={{ margin: 0 }}>Latest Sensor Reading</h2>
        <DataSourceBadge source={dataSource} />
      </div>
      <div style={contentStyle}>
        <p><strong>Sensor ID:</strong> {data.sensor_id}</p>
        <p><strong>Value:</strong> {data.value}</p>
        <p><strong>Timestamp:</strong> {formattedTimestamp}</p>
        {hasMetadata && (
          <div style={metadataContainerStyle}>
            <strong>Metadata:</strong>
            <pre style={preStyle}>
              {JSON.stringify(data.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

// Custom comparison function to prevent re-renders when data object reference changes but content is the same
const areSensorDataEqual = (prevProps: { data: SensorData; dataSource: 'realtime' | 'cache' }, nextProps: { data: SensorData; dataSource: 'realtime' | 'cache' }) => {
  // Compare all relevant fields including data source
  return (
    prevProps.dataSource === nextProps.dataSource &&
    prevProps.data.id === nextProps.data.id &&
    prevProps.data.sensor_id === nextProps.data.sensor_id &&
    prevProps.data.value === nextProps.data.value &&
    prevProps.data.timestamp === nextProps.data.timestamp &&
    JSON.stringify(prevProps.data.metadata) === JSON.stringify(nextProps.data.metadata)
  );
};

// Memoized with custom comparison
const SensorReadingDisplay = memo(SensorReadingDisplayComponent, areSensorDataEqual);
SensorReadingDisplay.displayName = 'SensorReadingDisplay';

// Memoized empty state component
const EmptyState = memo(() => (
  <div style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
    Waiting for sensor data...
    <br />
    <small>Send a POST request to /api/v1/sensors-readings/ to see real-time updates</small>
  </div>
));

EmptyState.displayName = 'EmptyState';

// Memoized instructions component (static content)
const Instructions = memo(() => (
  <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#e9ecef', borderRadius: '8px' }}>
    <h3>How to Test:</h3>
    <ol>
      <li>Make sure Django server is running on port 8000</li>
      <li>Make sure the listener worker is running: <code>python manage.py listen_sensor_updates</code></li>
      <li>Send a POST request to create a sensor reading:</li>
    </ol>
    <pre style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '4px', overflow: 'auto' }}>
{`curl -X POST http://localhost:8000/api/v1/sensors-readings/ \\
  -H "Content-Type: application/json" \\
  -d '{
    "sensor_id": "sensor1",
    "value": 25.5,
    "metadata": {"unit": "celsius"}
  }'`}
    </pre>
    <p style={{ marginTop: '1rem' }}>
      The update should appear here in real-time! 🚀
    </p>
  </div>
));

Instructions.displayName = 'Instructions';

export default function Index() {
  const { initialData } = useLoaderData<typeof loader>();

  // Memoize callbacks to prevent WebSocket hook re-initialization
  const handleMessage = useCallback((data: SensorData) => {
    console.log('Received sensor update:', data);
  }, []);

  const handleError = useCallback((err: Event) => {
    console.error('WebSocket error:', err);
  }, []);

  const { isConnected, latestData, error } = useWebSocket({
    url: 'ws://localhost:8000/ws/sensor-readings/',
    onMessage: handleMessage,
    onError: handleError,
  });

  // Use websocket data if available, otherwise fall back to initial loader data
  // Memoize to prevent unnecessary recalculations
  const displayData = useMemo(
    () => latestData || initialData,
    [latestData, initialData]
  );

  // Determine data source: 'realtime' if from WebSocket, 'cache' if from API
  const dataSource = useMemo(
    () => (latestData ? 'realtime' : 'cache') as 'realtime' | 'cache',
    [latestData]
  );

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.8', padding: '2rem' }}>
      <h1>Real-time Sensor Data</h1>
      
      <ConnectionStatus isConnected={isConnected} error={error} />

      {displayData ? (
        <SensorReadingDisplay data={displayData} dataSource={dataSource} />
      ) : (
        <EmptyState />
      )}

      <Instructions />
    </div>
  );
}

