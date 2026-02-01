import { useEffect, useState } from 'react';
import { getOrCreateDeviceId } from './utils/identity';

function App() {
    const [deviceId, setDeviceId] = useState('');

    useEffect(() => {
        const id = getOrCreateDeviceId();
        setDeviceId(id);
        console.log('App Initialized with Device ID:', id);
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 font-sans">
            <div className="bg-gray-800 text-white p-8 rounded-xl shadow-2xl text-center space-y-6 max-w-md w-full border border-gray-700">
                <h1 className="text-2xl font-bold text-green-400 tracking-wide">
                    Anonymous Chat – Device Initialization
                </h1>

                <p className="text-gray-400 text-sm">
                    Your unique anonymous identity has been generated.
                </p>

                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 shadow-inner">
                    <p className="text-xs uppercase text-gray-500 font-semibold mb-1">
                        Device ID
                    </p>
                    <p className="text-blue-300 font-mono text-lg break-all select-all">
                        {deviceId || 'Initializing...'}
                    </p>
                </div>

                <div className="pt-2">
                    <span className="inline-block px-3 py-1 bg-green-900/30 text-green-400 text-xs rounded-full border border-green-800">
                        System Online
                    </span>
                </div>
            </div>
        </div>
    );
}

export default App;