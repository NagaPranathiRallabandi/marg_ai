import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import L from 'leaflet';
import { socket } from '../socket'; // Import the shared socket

// --- Final working blip
const ambulanceIcon = new L.Icon({
  iconUrl: '/ambulance.png',
  iconSize: [40, 40],
});

function AmbulanceView() {
  const [allSignals, setAllSignals] = useState([]);
  const [startPoint, setStartPoint] = useState('');
  const [endPoint, setEndPoint] = useState('');
  const [route, setRoute] = useState(null);
  const [tripStarted, setTripStarted] = useState(false);
  const [ambulancePosition, setAmbulancePosition] = useState(null);

  useEffect(() => {
    socket.connect();

    axios.get('http://localhost:5000/api/signals')
      .then(response => setAllSignals(response.data));

    const onTripStarted = (data) => {
      setTripStarted(true);
      setRoute(data.route);
      setAmbulancePosition(data.position);
    };
    const onLocationUpdate = (data) => setAmbulancePosition(data.position);
    const onTripEnded = () => {
      setTripStarted(false);
      setRoute(null);
      setAmbulancePosition(null);
    };

    socket.on('trip_started', onTripStarted);
    socket.on('update_location', onLocationUpdate);
    socket.on('trip_ended', onTripEnded);

    return () => {
      socket.off('trip_started', onTripStarted);
      socket.off('update_location', onLocationUpdate);
      socket.off('trip_ended', onTripEnded);
      socket.disconnect();
    };
  }, []);

  const handleCalculateRoute = () => {
    if (!startPoint || !endPoint) return;
    const startCoords = JSON.parse(startPoint);
    const endCoords = JSON.parse(endPoint);
    axios.post('http://localhost:5000/api/calculate-route', { start: startCoords, end: endCoords })
      .then(response => {
        setRoute(response.data.route);
        setAmbulancePosition(startCoords);
      });
  };

  const handleStartTrip = () => {
    if (!route) return;
    socket.emit('start_trip', { route });
  };

  // This is the function that will be called when the Cancel button is pressed
const handleCancelTrip = () => {
    // This line sends the 'cancel_trip' event to the server
    socket.emit('cancel_trip');
};

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

        {!tripStarted ? (
          <>
            <button onClick={handleCalculateRoute} disabled={tripStarted}>Calculate Path</button>
            <button onClick={handleStartTrip} disabled={!route || tripStarted}>
              Start Trip
            </button>
          </>
        ) : (
          <button onClick={handleCancelTrip} className="cancel-button">
            Cancel Trip
          </button>
        )}
      </div>
      <MapContainer center={[16.5062, 80.6480]} zoom={14} style={{ height: 'calc(100vh - 80px)', width: '100%' }}>
        <TileLayer url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
        {route && <Polyline positions={route.coordinates.map(p => [p[1], p[0]])} color="blue" />}
        {ambulancePosition && <Marker position={ambulancePosition} icon={ambulanceIcon} />}
      </MapContainer>
    </div>
  );
}

export default AmbulanceView;