import { useEffect, useState } from 'react';
import { getOrCreateDeviceId } from '../utils/identity';
import CameraVerification from './CameraVerification';
import ProfileSetup from './ProfileSetup';

function User() {
    const [deviceId, setDeviceId] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [userData, setUserData] = useState(null);
    const [showProfileSetup, setShowProfileSetup] = useState(false);
    const [profileData, setProfileData] = useState(null);

    useEffect(() => {
        const id = getOrCreateDeviceId();
        setDeviceId(id);
        console.log('User initialized with Device ID:', id);
    }, []);

    const handleVerificationComplete = (data) => {
        setUserData(data);
        setIsVerified(true);

        setTimeout(() => { setShowProfileSetup(true); }, 2000);
    };

    const handleProfileComplete = (profile) => { setProfileData(profile); };

    if (!isVerified) {
        return (
            <CameraVerification
                onVerificationComplete={handleVerificationComplete}
            />
        );
    }

    if (!showProfileSetup) {
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

                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 shadow-inner">
                        <p className="text-xs uppercase text-gray-500 font-semibold mb-1">
                            Device ID
                        </p>
                        <p className="text-gray-400 font-mono text-xs break-all">
                            {deviceId}
                        </p>
                    </div>

                    <span className="inline-block px-3 py-1 bg-green-900/30 text-green-400 text-xs rounded-full border border-green-800 animate-pulse">
                        Redirecting to Profile...
                    </span>
                </div>
            </div>
        );
    }

    if (!profileData) {
        return (
            <ProfileSetup
                onProfileComplete={handleProfileComplete}
            />
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 font-sans">
            <div className="bg-gray-800 text-white p-8 rounded-xl shadow-2xl text-center space-y-6 max-w-md w-full border border-gray-700">
                <h1 className="text-2xl font-bold text-green-400 tracking-wide">
                    Ready for Matching
                </h1>

                <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                    <h3 className="text-xl font-bold">
                        {profileData.nickname}
                    </h3>

                    {profileData.bio && (
                        <p className="text-gray-400 text-sm italic">
                            "{profileData.bio}"
                        </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                        <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-500 border border-gray-700">
                            {profileData.personalityAnswers.q1}
                        </span>
                        <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-500 border border-gray-700">
                            {profileData.personalityAnswers.q2}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900 p-3 rounded border border-gray-700">
                        <p className="text-xs text-gray-500 uppercase">Gender</p>
                        <p className="text-blue-300 capitalize">
                            {userData?.gender || 'Unknown'}
                        </p>
                    </div>

                    <div className="bg-gray-900 p-3 rounded border border-gray-700">
                        <p className="text-xs text-gray-500 uppercase">Device ID</p>
                        <p className="text-gray-400 text-xs truncate" title={deviceId}>
                            {deviceId}
                        </p>
                    </div>
                </div>

                <button className="w-full py-3 bg-purple-600 hover:bg-purple-700 font-bold rounded-lg shadow-lg">
                    Find a Chat Partner
                </button>
            </div>
        </div>
    );
}

export default User;