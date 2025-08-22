import React from 'react';
import './LogPanel.css';

function LogPanel({ logs }) {
  return (
    <div className="log-panel">
      <h4>Live Event Log</h4>
      <div className="log-content">
        {logs.map((log, index) => (
          <p key={index} className={log.type === 'error' ? 'log-error' : 'log-info'}>
            <span>{log.timestamp}:</span> {log.message}
          </p>
        ))}
      </div>
    </div>
  );
}

export default LogPanel;