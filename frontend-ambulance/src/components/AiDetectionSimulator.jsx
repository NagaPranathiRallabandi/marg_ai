import React from 'react';
import axios from 'axios';
import './AiDetectionSimulator.css';

// A placeholder for a test image.
// IMPORTANT: Make sure you have an image named 'test_ambulance.jpg' in your 'frontend/public' folder.
const TEST_IMAGE_NAME = 'test_ambulance.jpg'; 

function AiDetectionSimulator({ signals, addLog }) {

  const handleSimulateDetection = async (signal) => {
    addLog(`Simulating camera detection at ${signal.name}...`);
    
    try {
      // Fetch the test image from the public folder
      const response = await fetch(`/${TEST_IMAGE_NAME}`);
      if (!response.ok) {
        throw new Error(`Could not find the test image: /${TEST_IMAGE_NAME}`);
      }
      const imageBlob = await response.blob();
      const imageFile = new File([imageBlob], TEST_IMAGE_NAME, { type: 'image/jpeg' });

      // Create form data to send
      const formData = new FormData();
      formData.append('image', imageFile);

      // Call the detection API for the first time (potential detection)
      await axios.post(`http://localhost:5000/api/detect-vehicle/${signal.id}`, formData);
      addLog(`AI Model analyzing first frame from ${signal.name}...`);

      // Call it a second time immediately to simulate a confirmation
      const apiResponse = await axios.post(`http://localhost:5000/api/detect-vehicle/${signal.id}`, formData);

      if (apiResponse.data.vehicle_detected) {
        addLog(`AI Result: CONFIRMED Emergency Vehicle at ${signal.name} with ${Math.round(apiResponse.data.detections[0].confidence * 100)}% confidence.`);
      } else {
        addLog(`AI Result: No emergency vehicle confirmed at ${signal.name}.`);
      }

    } catch (error) {
      addLog(`Error during AI simulation: ${error.message}`, 'error');
    }
  };

  return (
    <div className="ai-simulator-panel">
      <h4>AI Camera Simulator</h4>
      <div className="simulator-buttons">
        {signals.map(signal => (
          <button key={signal.id} onClick={() => handleSimulateDetection(signal)}>
            Detect @ {signal.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default AiDetectionSimulator;
