import React from 'react';
import './AlertPanel.css'; // We will create this file next

function AlertPanel({ alertData, onDismiss }) {
  if (!alertData) {
    return null; // Don't render anything if there's no alert
  }

  return (
    <div className="alert-panel">
      <div className="alert-header">
        <h2>🚨 Emergency Alert! 🚨</h2>
      </div>
      <div className="alert-body">
        <p>Vehicle approaching:</p>
        <h3>{alertData.signalName}</h3>
        <p>Estimated Arrival: <strong>{alertData.eta}</strong></p>
      </div>
      <button className="dismiss-button" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}

export default AlertPanel;