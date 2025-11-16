import { useWebSocket } from '~/hooks/useWebSocket';

export default function Index() {
  const { isConnected, latestData, error } = useWebSocket({
    url: 'ws://localhost:8000/ws/sensors/',
    onMessage: (data) => {
      console.log('Received sensor update:', data);
    },
    onError: (err) => {
      console.error('WebSocket error:', err);
    },
  });

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

      {latestData ? (
        <div
          style={{
            border: '2px solid #007bff',
            borderRadius: '8px',
            padding: '1.5rem',
            backgroundColor: '#f8f9fa',
          }}
        >
          <h2>Latest Sensor Reading</h2>
          <div style={{ marginTop: '1rem' }}>
            <p><strong>Sensor ID:</strong> {latestData.sensor_id}</p>
            <p><strong>Value:</strong> {latestData.value}</p>
            <p><strong>Timestamp:</strong> {new Date(latestData.timestamp).toLocaleString()}</p>
            {latestData.metadata && Object.keys(latestData.metadata).length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <strong>Metadata:</strong>
                <pre style={{ backgroundColor: '#fff', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                  {JSON.stringify(latestData.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
          Waiting for sensor data...
          <br />
          <small>Send a POST request to /api/sensors/ to see real-time updates</small>
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
{`curl -X POST http://localhost:8000/api/sensors/ \\
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

