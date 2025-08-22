import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import io from 'socket.io-client';
import AlertPanel from './AlertPanel';
import SignalMarker from './SignalMarker'; // 1. Import the new component

function MapView() {
  const [signals, setSignals] = useState([]);
  const [alertData, setAlertData] = useState(null);

  const handleClearRoute = () => {
    if (!alertData) return;
    
    axios.post(`http://localhost:5000/api/clear-signal/${alertData.signalId}`)
      .then(response => {
        console.log(response.data.message);
        setAlertData(null); 
      })
      .catch(error => console.error('Error clearing signal:', error));
  };

  useEffect(() => {
    const socket = io('http://localhost:5000');

    axios.get('http://localhost:5000/api/signals')
      .then(response => setSignals(response.data))
      .catch(error => console.error('Error fetching signals:', error));

    socket.on('emergency_alert', (data) => {
      setAlertData(data);
    });

    socket.on('signal_cleared', (data) => {
      setSignals(currentSignals => 
        currentSignals.map(signal => 
          signal.id === data.signalId ? { ...signal, status: data.newStatus } : signal
        )
      );
    });

    return () => socket.disconnect();
  }, []);

  return (
    <>
      <AlertPanel 
        alertData={alertData} 
        onDismiss={() => setAlertData(null)} 
        onClear={handleClearRoute}
      />
      <MapContainer center={[16.5062, 80.6480]} zoom={14} style={{ height: '100vh', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
        
        {/* 2. Use the new SignalMarker component in the loop */}
        {signals.map(signal => (
          <SignalMarker
            key={signal.id}
            signal={signal}
            isAlerted={alertData && signal.id === alertData.signalId}
          />
        ))}
      </MapContainer>
    </>
  );
}

export default MapView;
