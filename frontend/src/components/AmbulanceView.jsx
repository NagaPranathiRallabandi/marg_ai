import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import io from 'socket.io-client';

// A simple ambulance icon
import L from 'leaflet';
const ambulanceIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/128/3448/3448632.png',
    iconSize: [40, 40],
});

// Create a single socket connection
const socket = io('http://localhost:5000');

function AmbulanceView() {
  const [allSignals, setAllSignals] = useState([]);
  const [startPoint, setStartPoint] = useState('');
  const [endPoint, setEndPoint] = useState('');
  const [route, setRoute] = useState(null);
  const [signalsOnRoute, setSignalsOnRoute] = useState([]);
  const [tripStarted, setTripStarted] = useState(false);
  const [ambulancePosition, setAmbulancePosition] = useState(null);
  
  const intervalRef = useRef(null);

  useEffect(() => {
    axios.get('http://localhost:5000/api/signals')
      .then(response => setAllSignals(response.data))
      .catch(error => console.error('Error fetching signals:', error));
      
    // Clean up interval on component unmount
    return () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
    };
  }, []);

  const handleCalculateRoute = () => {
    if (!startPoint || !endPoint) return alert("Please select start and end points.");
    const startCoords = JSON.parse(startPoint);
    const endCoords = JSON.parse(endPoint);

    axios.post('http://localhost:5000/api/calculate-route', { start: startCoords, end: endCoords })
      .then(response => {
        setRoute(response.data.route);
        setSignalsOnRoute(response.data.signals);
        setAmbulancePosition(startCoords); // Set initial position
      }).catch(error => alert("Could not calculate route."));
  };

  const handleStartTrip = () => {
    setTripStarted(true);
    // Emit the event to the backend to inform the police dashboard
    socket.emit('start_trip', { route, signals: signalsOnRoute });

    // --- Simulate the ambulance moving along the route ---
    let step = 0;
    intervalRef.current = setInterval(() => {
      if (step >= route.coordinates.length) {
        clearInterval(intervalRef.current);
        setTripStarted(false); // End of trip
        return;
      }
      const newPosition = [route.coordinates[step][1], route.coordinates[step][0]]; // OSRM is [lng, lat]
      setAmbulancePosition(newPosition);
      // Emit location update to the police dashboard
      socket.emit('update_location', { position: newPosition });
      step++;
    }, 1000); // Update position every second
  };

  const mapCenter = [16.5062, 80.6480];

  return (
    <div>
      <div className="route-planner">
        <h2>Ambulance Route Planner</h2>
        <select onChange={e => setStartPoint(e.target.value)} value={startPoint} disabled={tripStarted}>
          <option value="">Select Start Point</option>
          {allSignals.map(s => <option key={s.id} value={`[${s.latitude}, ${s.longitude}]`}>{s.name}</option>)}
        </select>
        <select onChange={e => setEndPoint(e.target.value)} value={endPoint} disabled={tripStarted}>
          <option value="">Select Destination</option>
          {allSignals.map(s => <option key={s.id} value={`[${s.latitude}, ${s.longitude}]`}>{s.name}</option>)}
        </select>
        <button onClick={handleCalculateRoute} disabled={tripStarted}>Calculate Path</button>
        <button onClick={handleStartTrip} disabled={!route || tripStarted}>
          {tripStarted ? 'Trip in Progress...' : 'Start Trip'}
        </button>
      </div>
      <MapContainer center={mapCenter} zoom={14} style={{ height: 'calc(100vh - 80px)', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {route && <Polyline positions={route.coordinates.map(p => [p[1], p[0]])} color="blue" />}
        {ambulancePosition && <Marker position={ambulancePosition} icon={ambulanceIcon} />}
      </MapContainer>
    </div>
  );
}

export default AmbulanceView;
