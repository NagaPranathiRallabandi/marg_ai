import PoliceView from './components/PoliceView';

function App() {
  // This app now ONLY shows the Police Dashboard
  return (
    <div className="App">
      <h1 className="dashboard-title">Police Control Dashboard</h1>
      <PoliceView />
    </div>
  );
}

export default App;