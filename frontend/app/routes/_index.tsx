import { useWebSocket } from '~/hooks/useWebSocket';
import { useEffect, useState } from 'react';

interface SensorData {
  id: number;
  sensor_id: string;
  value: number;
  timestamp: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export default function Index() {
  const [hasCheckedAPI, setHasCheckedAPI] = useState(false);
  const [apiData, setApiData] = useState<SensorData | null>(null);
  const { isConnected, latestData, hasReceivedWebSocketData, error, updateDataFromAPI } = useWebSocket({
    url: 'ws://localhost:8000/ws/sensor-readings/',
    onMessage: (data) => {
      console.log('Received sensor update:', data);
    },
    onError: (err) => {
      console.error('WebSocket error:', err);
    },
  });

  // Priority: WebSocket > API > No data
  // Fetch from API only if we haven't received WebSocket data
  useEffect(() => {
    // Only fetch from API if we haven't received WebSocket data and haven't checked API yet
    if (!hasReceivedWebSocketData && !hasCheckedAPI) {
      const fetchLatestReading = async () => {
        try {
          const response = await fetch('http://localhost:8000/api/v1/sensors-readings/?limit=1');
          if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
              const apiReading: SensorData = data[0];
              setApiData(apiReading);
              updateDataFromAPI(apiReading);
            }
          }
        } catch (err) {
          console.error('Error fetching latest reading:', err);
        } finally {
          setHasCheckedAPI(true);
        }
      };

      fetchLatestReading();
    }
  }, [hasReceivedWebSocketData, hasCheckedAPI, updateDataFromAPI]);

  // Determine which data to display
  const displayData = hasReceivedWebSocketData ? latestData : (latestData || apiData);
  const dataSource = hasReceivedWebSocketData ? 'websocket' : (latestData ? 'localStorage' : apiData ? 'api' : null);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.8', padding: '2rem' }}>
      <h1>Real-time Sensor Data</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <div
          style={{
            padding: '1rem',
            borderRadius: '8px',
            backgroundColor: isConnected ? '#d4edda' : '#f8d7da',
            color: isConnected ? '#155724' : '#721c24',
            display: 'inline-block',
            marginBottom: '1rem',
          }}
        >
          Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
        {error && (
          <div style={{ color: '#dc3545', marginTop: '0.5rem' }}>
            Error: {error}
          </div>
        )}
      </div>

      {displayData ? (
        <div
          style={{
            border: '2px solid #007bff',
            borderRadius: '8px',
            padding: '1.5rem',
            backgroundColor: '#f8f9fa',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>Latest Sensor Reading</h2>
            <span
              style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                backgroundColor: dataSource === 'websocket' ? '#d4edda' : '#fff3cd',
                color: dataSource === 'websocket' ? '#155724' : '#856404',
              }}
            >
              {dataSource === 'websocket' ? '🟢 Real-time' : dataSource === 'api' ? '📡 From API' : '💾 Cached'}
            </span>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <p><strong>Sensor ID:</strong> {displayData.sensor_id}</p>
            <p><strong>Value:</strong> {displayData.value}</p>
            <p><strong>Timestamp:</strong> {new Date(displayData.timestamp).toLocaleString()}</p>
            <p><strong>Created At:</strong> {new Date(displayData.created_at).toLocaleString()}</p>
            <p><strong>Updated At:</strong> {new Date(displayData.updated_at).toLocaleString()}</p>
            {displayData.metadata && Object.keys(displayData.metadata).length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <strong>Metadata:</strong>
                <pre style={{ backgroundColor: '#fff', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                  {JSON.stringify(displayData.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
          {hasCheckedAPI ? (
            <>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                ⚠️ Sensor hasn't sent any data yet
              </p>
              <small>Send a POST request to /api/v1/sensors-readings/ to create a sensor reading</small>
            </>
          ) : (
            <>
              Waiting for sensor data...
              <br />
              <small>Checking API for existing data...</small>
            </>
          )}
        </div>
      )}

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
    </div>
  );
}

