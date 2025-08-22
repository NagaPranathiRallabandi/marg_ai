import MapView from './components/MapView';
import ControlPanel from './components/ControlPanel'; // Import the new component

function App() {
  return (
    <div className="App">
      <MapView />
      <ControlPanel /> {/* Add the control panel here */}
    </div>
  )
}

export default App