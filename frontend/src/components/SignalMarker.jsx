import React, { useEffect, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// --- Define Icons ---
const alertIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/128/684/684908.png',
  iconSize: [35, 35],
});
const defaultIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
const greenIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/128/4315/4315445.png',
  iconSize: [35, 35],
});
// --------------------

function SignalMarker({ signal, isAlerted }) {
  const markerRef = useRef(null);

  // This effect runs whenever the signal status or alert status changes
  useEffect(() => {
    const marker = markerRef.current;
    if (marker) {
      if (isAlerted) {
        marker.setIcon(alertIcon);
      } else if (signal.status === 'GREEN') {
        marker.setIcon(greenIcon);
      } else {
        marker.setIcon(defaultIcon);
      }
    }
  }, [signal.status, isAlerted]);

  return (
    <Marker
      ref={markerRef}
      key={signal.id}
      position={[signal.latitude, signal.longitude]}
      icon={defaultIcon} // Start with the default icon
    >
      <Popup>
        <b>{signal.name}</b><br />
        Status: <span style={{ color: signal.status === 'GREEN' ? 'green' : 'black' }}>{signal.status}</span>
        {isAlerted && <div style={{ color: 'red', fontWeight: 'bold' }}>EMERGENCY NEARBY</div>}
      </Popup>
    </Marker>
  );
}

export default SignalMarker;