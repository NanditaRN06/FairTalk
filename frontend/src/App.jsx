import { useEffect, useState } from 'react';
import { getOrCreateDeviceId } from './utils/identity';
import CameraVerification from './components/CameraVerification';

function App() {
    const [deviceId, setDeviceId] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        const id = getOrCreateDeviceId();
        setDeviceId(id);
        console.log('App Initialized with Device ID:', id);
    }, []);

    const handleVerificationComplete = (data) => {
        setUserData(data);
        setIsVerified(true);
    };

    if (!isVerified) {
        return <CameraVerification onVerificationComplete={handleVerificationComplete} />;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 font-sans">
            <div className="bg-gray-800 text-white p-8 rounded-xl shadow-2xl text-center space-y-6 max-w-md w-full border border-gray-700">
                <h1 className="text-2xl font-bold text-green-400 tracking-wide">
                    Identity Verified
                </h1>

                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 shadow-inner">
                    <p className="text-xs uppercase text-gray-500 font-semibold mb-1">
                        Detected Gender
                    </p>
                    <p className="text-blue-300 font-mono text-lg capitalize">
                        {userData?.gender || 'Unknown'}
                    </p>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 shadow-inner mt-4">
                    <p className="text-xs uppercase text-gray-500 font-semibold mb-1">
                        Device ID
                    </p>
                    <p className="text-gray-400 font-mono text-xs break-all">
                        {deviceId}
                    </p>
                </div>

                <div className="pt-2">
                    <span className="inline-block px-3 py-1 bg-green-900/30 text-green-400 text-xs rounded-full border border-green-800">
                        Proceeding to Chat...
                    </span>
                </div>
            </div>
        </div>
    );
}

export default App;