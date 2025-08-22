import React, { useState } from 'react';
import axios from 'axios';
import './ControlPanel.css';

function ControlPanel() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSimulate = () => {
    setIsLoading(true);
    axios.post('http://localhost:5000/api/simulate-green-corridor')
      .then(response => {
        console.log(response.data.message);
      })
      .catch(error => {
        console.error('Error starting simulation:', error);
      })
      .finally(() => {
        // Hide loading state after 5 seconds to re-enable the button
        setTimeout(() => setIsLoading(false), 5000);
      });
  };

  return (
    <div className="control-panel">
      <h4>Simulation Controls</h4>
      <button onClick={handleSimulate} disabled={isLoading}>
        {isLoading ? 'Simulation in Progress...' : 'Simulate Green Corridor'}
      </button>
    </div>
  );
}

export default ControlPanel;