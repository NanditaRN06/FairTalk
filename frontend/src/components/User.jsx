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
            const response = await fetch(`http://localhost:9000/api/user/eligibility/${deviceId}`);
            const eligibilityData = await response.json();
            const sessionUserId = crypto.randomUUID();

            const payload = {
                deviceId,
                userId: sessionUserId,
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
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-vibrant-emerald/20 rounded-full blur-[120px] animate-pulse-slow"></div>
                </div>

                <div className="glass-card p-10 rounded-[3rem] text-center max-w-sm w-full relative z-10 animate-fade-in shadow-[0_0_50px_rgba(16,185,129,0.15)] border-vibrant-emerald/20">
                    <div className="w-24 h-24 bg-gradient-to-br from-vibrant-emerald to-emerald-600 rounded-3xl flex items-center justify-center text-5xl mx-auto mb-8 shadow-2xl shadow-vibrant-emerald/40 rotate-12 group hover:rotate-0 transition-transform duration-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <h1 className="text-3xl font-heading font-extrabold text-white mb-3 tracking-tight">Verified!</h1>
                    <p className="text-slate-400 font-medium mb-10 leading-relaxed">You're real. Let's get you set up for the space.</p>

                    <div className="flex items-center justify-center gap-3">
                        <div className="w-2 h-2 bg-vibrant-emerald rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-vibrant-emerald rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-2 h-2 bg-vibrant-emerald rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!profileData) { return <ProfileSetup onProfileComplete={handleProfileComplete} />; }

    if (handoffPayload && !searching && !enteredChat) {
        if (!handoffPayload.eligible) {
            return (
                <div className="min-h-screen flex items-center justify-center p-4">
                    <div className="glass-card p-10 rounded-[3rem] text-center max-w-md w-full relative z-10 animate-fade-in border-vibrant-rose/30 shadow-[0_0_50px_rgba(244,63,94,0.1)]">
                        <div className="w-24 h-24 bg-vibrant-rose/10 rounded-full flex items-center justify-center text-4xl mx-auto mb-8 text-vibrant-rose border border-vibrant-rose/20 shadow-inner">
                            ✕
                        </div>
                        <h2 className="text-3xl font-heading font-extrabold text-white mb-4 tracking-tight">Access Paused</h2>
                        <p className="text-slate-400 font-medium leading-relaxed px-4">
                            You've high-fived the daily limit or your signal was a bit static today.
                            <br /><span className="text-slate-300">Try again after some rest tomorrow.</span>
                        </p>
                    </div>
                </div>
            );
        }

        return <EligibilityConfirmation onJoin={handleJoinChat} onLeave={handleLeaveChat} />;
    }

    if (searching) {
        return (
            <MatchingQueue
                deviceId={deviceId}
                userId={handoffPayload.userId}
                profileData={profileData}
                onMatchFound={handleMatchFound}
            />
        );
    }

    if (enteredChat) {
        const myUserId = handoffPayload.userId;
        const isUserA = matchInfo.userA.userId === myUserId;
        const partnerName = isUserA ? matchInfo.userB.nickname : matchInfo.userA.nickname;

        return (
            <ChatPage
                deviceId={deviceId}
                userId={myUserId}
                matchId={matchInfo.matchId}
                partnerName={partnerName}
                onLeave={handleLeaveChat}
            />
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="flex flex-col items-center gap-6">
                <div className="relative group">
                    <div className="w-20 h-20 bg-gradient-to-tr from-brand-primary to-brand-secondary rounded-3xl flex items-center justify-center shadow-2xl shadow-brand-primary/20 animate-float relative z-10">
                        <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 13.4876 3.36033 14.8911 4 16.1247L3 21L7.87531 20C9.10887 20.6397 10.5124 21 12 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M8 9H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M8 13H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div className="absolute inset-x-0 -bottom-4 h-1 bg-brand-primary/20 rounded-full blur-md animate-pulse"></div>
                </div>
                <div className="text-brand-primary font-heading font-black text-xs tracking-[0.4em] uppercase animate-pulse">Syncing...</div>
            </div>
        </div>
    );
}


export default User;