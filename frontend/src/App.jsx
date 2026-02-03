import User from './components/User';

function App() {
    return (
        <div className="min-h-screen relative selection:bg-brand-primary/30">
            <div className="noise-overlay" />
            <User />
        </div>
    );
}

export default App;