import React, { useEffect, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// --- Define Icons ---
const defaultIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
const greenIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/128/4315/4315445.png',
  iconSize: [35, 35],
});

function SignalMarker({ signal, onSignalClick }) {
  const markerRef = useRef(null);

  useEffect(() => {
    const marker = markerRef.current;
    if (marker) {
      marker.setIcon(signal.status === 'GREEN' ? greenIcon : defaultIcon);
    }
  }, [signal.status]);

  return (
    <Marker
      ref={markerRef}
      position={[signal.latitude, signal.longitude]}
      icon={defaultIcon}
      // Add the event handler here
      eventHandlers={{
        click: () => {
          onSignalClick(signal.id);
        },
      }}
    >
      <Popup>
        <b>{signal.name}</b><br />
        Status: <span style={{ color: signal.status === 'GREEN' ? 'green' : 'black' }}>{signal.status}</span>
      </Popup>
    </Marker>
  );
}

export default SignalMarker;
