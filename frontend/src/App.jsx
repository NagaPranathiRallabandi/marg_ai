import React, { useState } from 'react';
import PoliceView from './components/PoliceView'; // Renamed from MapView
import AmbulanceView from './components/AmbulanceView'; // The new component we will create
import './App.css'; // A new CSS file for styling the view switcher

function App() {
  const [view, setView] = useState('police'); // 'police' or 'ambulance'

  return (
    <div className="App">
      <div className="view-switcher">
        <button onClick={() => setView('police')} className={view === 'police' ? 'active' : ''}>
          Police Dashboard
        </button>
        <button onClick={() => setView('ambulance')} className={view === 'ambulance' ? 'active' : ''}>
          Ambulance Dashboard
        </button>
      </div>

      {/* Conditionally render the correct view based on the state */}
      {view === 'police' ? <PoliceView /> : <AmbulanceView />}
    </div>
  );
}

export default App;