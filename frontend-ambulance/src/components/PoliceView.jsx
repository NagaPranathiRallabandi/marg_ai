import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import io from 'socket.io-client';
import L from 'leaflet';
import SignalMarker from './SignalMarker';
import LogPanel from './LogPanel';

const ambulanceIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/128/3448/3448632.png',
    iconSize: [40, 40],
    className: 'custom-ambulance-icon'
});

const socket = io('http://localhost:5000');

function PoliceView() {
  const [signals, setSignals] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeRoute, setActiveRoute] = useState(null);
  const [ambulancePosition, setAmbulancePosition] = useState(null);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [{ timestamp, message }, ...prevLogs]);
  };

  const handleSignalClick = (signalId) => {
    const signal = signals.find(s => s.id === signalId);
    if (signal) {
        addLog(`Operator action: Manually clearing route at ${signal.name}.`);
        socket.emit('manual_clear_signal', { signalId });
    }
  };

  useEffect(() => {
    addLog("Police dashboard initialized.");
    socket.on('connect', () => addLog("Real-time connection established."));

    axios.get('http://localhost:5000/api/signals')
      .then(response => setSignals(response.data));

    socket.on('trip_started', (data) => {
      addLog("ALERT: New ambulance trip started!");
      setActiveRoute(data.route);
      setAmbulancePosition([data.route.coordinates[0][1], data.route.coordinates[0][0]]);
    });

    socket.on('location_updated', (data) => {
      setAmbulancePosition(data.position);
    });
    
    socket.on('signal_cleared', (data) => {
        setSignals(currentSignals => 
            currentSignals.map(s => 
              s.id === data.signalId ? { ...s, status: 'GREEN' } : s
            )
        );
    });

    return () => socket.disconnect();
  }, []);

  return (
    <>
      <LogPanel logs={logs} /> 
      <MapContainer center={[16.5062, 80.6480]} zoom={14} style={{ height: '100vh', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {signals.map(signal => (
          <SignalMarker
            key={signal.id}
            signal={signal}
            onSignalClick={handleSignalClick}
          />
        ))}
        
        {activeRoute && <Polyline positions={activeRoute.coordinates.map(p => [p[1], p[0]])} color="red" />}
        {ambulancePosition && <Marker position={ambulancePosition} icon={ambulanceIcon} />}
      </MapContainer>
    </>
  );
}

export default PoliceView;