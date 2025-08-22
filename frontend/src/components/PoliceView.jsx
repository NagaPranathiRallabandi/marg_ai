import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import io from 'socket.io-client';
import L from 'leaflet';
import AlertPanel from './AlertPanel';
import SignalMarker from './SignalMarker';
import LogPanel from './LogPanel';
import AiDetectionSimulator from './AiDetectionSimulator';

// --- Ambulance Icon ---
const ambulanceIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/128/3448/3448632.png',
    iconSize: [40, 40],
});

// Create a single socket connection
const socket = io('http://localhost:5000');

// Helper function to calculate distance
const calculateDistance = (pos1, pos2) => {
    const R = 6371e3; // metres
    const φ1 = pos1[0] * Math.PI/180;
    const φ2 = pos2[0] * Math.PI/180;
    const Δφ = (pos2[0]-pos1[0]) * Math.PI/180;
    const Δλ = (pos2[1]-pos1[1]) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

function PoliceView() {
  const [signals, setSignals] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeRoute, setActiveRoute] = useState(null);
  const [signalsOnRoute, setSignalsOnRoute] = useState([]);
  const [ambulancePosition, setAmbulancePosition] = useState(null);
  const [alertedSignal, setAlertedSignal] = useState(null);
  const alertedSignalsRef = useRef(new Set());
  
  // Use a ref to hold the signals to prevent stale state in socket listeners
  const signalsRef = useRef(signals);
  signalsRef.current = signals;

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [{ timestamp, message, type }, ...prevLogs]);
  };

  // This useEffect runs only ONCE to set up listeners
  useEffect(() => {
    addLog("Police dashboard initialized.");
    socket.on('connect', () => addLog("Real-time connection established."));

    axios.get('http://localhost:5000/api/signals')
      .then(response => setSignals(response.data));

    socket.on('trip_started', (data) => {
      addLog("ALERT: New ambulance trip started!");
      setActiveRoute(data.route);
      setSignalsOnRoute(data.signals);
      setAmbulancePosition([data.route.coordinates[0][1], data.route.coordinates[0][0]]);
      alertedSignalsRef.current.clear();
    });

    socket.on('location_updated', (data) => {
      setAmbulancePosition(data.position);
    });

    socket.on('emergency_alert', (data) => {
        // Use the ref to get the most up-to-date signals array
        const signal = signalsRef.current.find(s => s.id === data.signalId);
        if (signal) {
            addLog(`ALERT: Emergency confirmed near ${signal.name}!`);
            setAlertedSignal(signal);
        }
    });
    
    socket.on('signal_cleared', (data) => {
        const signal = signalsRef.current.find(s => s.id === data.signalId);
        if (signal) {
            addLog(`Operator cleared route for ${signal.name}.`);
            setSignals(currentSignals => 
                currentSignals.map(s => 
                  s.id === data.signalId ? { ...s, status: 'GREEN' } : s
                )
            );
        }
    });

    return () => {
        socket.off('connect');
        socket.off('trip_started');
        socket.off('location_updated');
        socket.off('emergency_alert');
        socket.off('signal_cleared');
    };
  }, []); // Empty dependency array ensures this runs only once

  // This useEffect handles the proximity checks
  useEffect(() => {
    if (!ambulancePosition || signalsOnRoute.length === 0) return;

    signalsOnRoute.forEach(signal => {
        const distance = calculateDistance(ambulancePosition, [signal.latitude, signal.longitude]);
        if (distance < 500 && !alertedSignalsRef.current.has(signal.id)) {
            addLog(`Ambulance is approaching ${signal.name}. Triggering alert.`);
            setAlertedSignal(signal); 
            alertedSignalsRef.current.add(signal.id); 
        }
    });
  }, [ambulancePosition, signalsOnRoute]);

  return (
    <>
      <AlertPanel 
        alertData={alertedSignal ? { ...alertedSignal, signalName: alertedSignal.name, eta: 'Under 1 minute' } : null}
        onDismiss={() => setAlertedSignal(null)}
        onClear={() => {
            if (!alertedSignal) return;
            socket.emit('signal_cleared', { signalId: alertedSignal.id, newStatus: 'GREEN' });
            setAlertedSignal(null);
        }}
      />
      <LogPanel logs={logs} /> 
      <AiDetectionSimulator signals={signals} addLog={addLog} />
      <MapContainer center={[16.5062, 80.6480]} zoom={14} style={{ height: '100vh', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {signals.map(signal => (
          <SignalMarker
            key={signal.id}
            signal={signal}
            isAlerted={alertedSignal && signal.id === alertedSignal.id}
          />
        ))}
        
        {activeRoute && <Polyline positions={activeRoute.coordinates.map(p => [p[1], p[0]])} color="red" />}
        {ambulancePosition && <Marker position={ambulancePosition} icon={ambulanceIcon} />}
      </MapContainer>
    </>
  );
}

export default PoliceView;
