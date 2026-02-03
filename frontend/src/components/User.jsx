import { useEffect, useState } from 'react';
import { getOrCreateDeviceId } from '../utils/identity';
import CameraVerification from './CameraVerification';
import ProfileSetup from './ProfileSetup';
import EligibilityConfirmation from './EligibilityConfirmation';
import MatchingQueue from './MatchingQueue';
import ChatPage from './ChatPage';

function User() {
    const [deviceId, setDeviceId] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [userData, setUserData] = useState(null);
    const [showProfileSetup, setShowProfileSetup] = useState(false);
    const [profileData, setProfileData] = useState(null);
    const [handoffPayload, setHandoffPayload] = useState(null);
    const [searching, setSearching] = useState(false);
    const [matchInfo, setMatchInfo] = useState(null);
    const [enteredChat, setEnteredChat] = useState(false);

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

    const handleProfileComplete = async (profile) => {
        setProfileData(profile);
        setHandoffPayload(null);

        try {
            // Keep checks based on deviceId for anti-spam/bans
            const response = await fetch(`http://localhost:9000/api/user/eligibility/${deviceId}`);
            const eligibilityData = await response.json();

            // Generate a fresh User ID for this session/match attempt
            // This allows multiple 'users' (tabs) on the same device/browser to match
            const sessionUserId = crypto.randomUUID();

            const payload = {
                deviceId,
                userId: sessionUserId, // New session ID
                gender: userData?.gender || 'unknown',
                nickname: profile.nickname,
                eligible: eligibilityData.eligible === true
            };

            setHandoffPayload(payload);

        } catch (err) {
            console.error('Failed to check eligibility:', err);
            setHandoffPayload({ eligible: false });
        }
    };

    const handleJoinChat = () => {
        setSearching(true);
    };

    const handleMatchFound = (match) => {
        setMatchInfo(match);
        setSearching(false);
        setEnteredChat(true);
    };

    const handleLeaveChat = () => {
        setIsVerified(false);
        setUserData(null);
        setShowProfileSetup(false);
        setProfileData(null);
        setHandoffPayload(null);
        setSearching(false);
        setMatchInfo(null);
        setEnteredChat(false);
        window.location.reload();
    };

    if (!isVerified) {
        return <CameraVerification onVerificationComplete={handleVerificationComplete} />;
    }

    if (!showProfileSetup) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 font-sans">
                <div className="bg-gray-800 text-white p-8 rounded-xl shadow-2xl text-center space-y-6 max-w-md w-full border border-gray-700">
                    <h1 className="text-2xl font-bold text-green-400 tracking-wide">Identity Verified</h1>
                    <span className="inline-block px-3 py-1 bg-green-900/30 text-green-400 text-xs rounded-full border border-green-800 animate-pulse">
                        Redirecting to Profile...
                    </span>
                </div>
            </div>
        );
    }

    if (!profileData) { return <ProfileSetup onProfileComplete={handleProfileComplete} />; }

    if (handoffPayload && !searching && !enteredChat) {
        if (!handoffPayload.eligible) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                    <div className="p-8 bg-gray-800 rounded-xl border border-red-700 text-center">
                        <h2 className="text-xl text-red-500 font-bold mb-4">Not Eligible</h2>
                        <p>You have reached your daily limit or are blocked.</p>
                    </div>
                </div>
            );
        }

        return <EligibilityConfirmation onJoin={handleJoinChat} onLeave={handleLeaveChat} />;
    }

    if (searching) {
        return (
            <MatchingQueue
                deviceId={deviceId} // Keep for logs if needed
                userId={handoffPayload.userId} // Pass the session User ID
                profileData={profileData}
                onMatchFound={handleMatchFound}
            />
        );
    }

    if (enteredChat) {
        // Determine partner name logic
        // We compare against OUR userId now
        const myUserId = handoffPayload.userId;
        const isUserA = matchInfo.userA.userId === myUserId;
        const partnerName = isUserA ? matchInfo.userB.nickname : matchInfo.userA.nickname;

        return (
            <ChatPage
                deviceId={deviceId} // Legacy prop, maybe unused now
                userId={myUserId}   // New prop for socket connection
                matchId={matchInfo.matchId}
                partnerName={partnerName}
                onLeave={handleLeaveChat}
            />
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 font-sans">
            <div className="text-green-500 animate-pulse font-bold">Processing...</div>
        </div>
    );
}


export default User;