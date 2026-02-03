import { useState, useEffect, useRef } from "react";

const MatchingQueue = ({ deviceId, userId, profileData, gender, onMatchFound }) => {
    const [status, setStatus] = useState("initializing");
    const [seconds, setSeconds] = useState(0);
    const [showRelaxModal, setShowRelaxModal] = useState(false);
    const [hasConsented, setHasConsented] = useState(false);
    const [promptedAt, setPromptedAt] = useState(0);

    const socketRef = useRef(null);

    const SEARCH_THRESHOLD = 15;

    useEffect(() => {
        const interval = setInterval(() => {
            setSeconds(prev => {
                const newSec = prev + 1;
                if (newSec > 0 && newSec % SEARCH_THRESHOLD === 0 && status === "searching" && !showRelaxModal) {
                    setShowRelaxModal(true);
                    setPromptedAt(newSec);
                }
                return newSec;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [status, showRelaxModal]);

    useEffect(() => {
        const socket = new WebSocket(`ws://${window.location.hostname}:9000/ws/queue`);
        socketRef.current = socket;

        socket.onopen = () => {
            console.log("Connected to matching queue");
            socket.send(JSON.stringify({
                type: "join_queue",
                payload: {
                    deviceId,
                    userId,
                    nickname: profileData.nickname,
                    bio: profileData.bio,
                    gender: gender,
                    genderPreference: profileData.genderPreference,
                    personalityAnswers: profileData.personalityAnswers
                }
            }));
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.status === "queued") {
                setStatus("searching");
            } else if (data.status === "matched") {
                setStatus("matched");
                setShowRelaxModal(false);
                setTimeout(() => {
                    onMatchFound(data.match);
                }, 2000);
            }
        };

        socket.onclose = () => {
            console.log("Disconnected from matching queue");
        };

        return () => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.close();
            }
        };
    }, [deviceId, userId, profileData, onMatchFound]);

    const handleRelaxDecision = (consent) => {
        setShowRelaxModal(false);
        if (consent) {
            setHasConsented(true);
            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({
                    type: "update_criteria",
                    payload: { allowRelaxation: true }
                }));
            }
        }
    };

    const progress = Math.min((seconds / 30) * 100, 95);
    const segments = 12;

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            <div className={`absolute inset-0 transition-colors duration-1000 ${status === 'matched' ? 'bg-vibrant-emerald/5' : 'bg-brand-primary/5'}`}></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-primary/5 rounded-full blur-[180px] animate-blob"></div>

            <div className="w-full max-w-lg glass-card rounded-[4rem] p-10 sm:p-14 relative z-10 text-center shadow-2xl border-white/5 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-primary to-transparent opacity-50"></div>

                <div className="space-y-10 relative">
                    <div className="relative inline-flex items-center justify-center">
                        <div className="absolute w-48 h-48 animate-spin-slow">
                            {[...Array(segments)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`absolute w-1.5 h-6 rounded-full left-1/2 top-0 -translate-x-1/2 origin-[0_96px] transition-all duration-500 ${(i / segments) * 100 < progress ? 'bg-brand-primary' : 'bg-white/5'
                                        }`}
                                    style={{ transform: `rotate(${i * (360 / segments)}deg)` }}
                                ></div>
                            ))}
                        </div>

                        <div className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-700 ${status === 'matched'
                            ? 'bg-vibrant-emerald shadow-[0_0_50px_rgba(16,185,129,0.5)] rotate-0'
                            : 'bg-gradient-to-br from-brand-primary to-brand-secondary shadow-[0_0_40px_rgba(99,102,241,0.4)] animate-pulse'
                            }`}>
                            {status === 'matched' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-white animate-fade-in" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <span className="text-3xl animate-bounce">⚡</span>
                                </div>
                            )}
                        </div>

                        {!(status === 'matched') && (
                            <>
                                <div className="absolute w-32 h-32 border border-brand-primary/30 rounded-full animate-ping opacity-20"></div>
                                <div className="absolute w-40 h-40 border border-brand-secondary/20 rounded-full animate-ping opacity-10 [animation-delay:0.5s]"></div>
                            </>
                        )}
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-4xl font-heading font-black text-white tracking-tighter leading-tight italic">
                            {status === "matched" ? "SIGNAL LOCKED" : "TRANSMITTING..."}
                        </h2>

                        <p className="text-slate-400 font-bold text-sm tracking-widest uppercase h-6">
                            {status === "searching"
                                ? "Analyzing frequency patterns..."
                                : status === "matched"
                                    ? "Stabilizing connection..."
                                    : "Opening secure uplink..."}
                        </p>

                        <div className="inline-block px-4 py-1.5 bg-white/5 rounded-full text-[10px] font-black tracking-widest text-slate-500 uppercase">
                            Time active: {seconds}s
                        </div>
                    </div>

                    <div className="glass-card rounded-3xl p-6 border-white/5 shadow-inner bg-surface-darkest/30 flex items-center gap-5 transition-all hover:bg-surface-darkest/50 cursor-default">
                        <div className="relative">
                            <div className="w-16 h-16 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-2xl flex items-center justify-center text-3xl font-heading font-black text-white shadow-xl rotate-3">
                                {profileData.nickname.charAt(0).toUpperCase()}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-vibrant-emerald border-2 border-surface-card rounded-full shadow-lg"></div>
                        </div>
                        <div className="text-left flex-1 min-w-0">
                            <div className="text-white font-black font-heading text-lg tracking-tight mb-0.5 truncate uppercase">
                                {profileData.nickname}
                            </div>
                            <div className="text-slate-500 text-xs font-medium truncate italic">
                                {profileData.bio || "Searching for conversation..."}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-brand-secondary/10 rounded-full blur-3xl"></div>
            </div>

            {showRelaxModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-darkest/90 backdrop-blur-md animate-fade-in">
                    <div className="glass-card max-w-md w-full p-10 rounded-[3rem] border-white/10 shadow-[0_0_100px_rgba(99,102,241,0.2)] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-primary to-brand-accent"></div>

                        <div className="text-center space-y-6 relative z-10">
                            <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-2 text-4xl shadow-inner border border-brand-primary/20 rotate-12">
                                🔍
                            </div>

                            <h3 className="text-3xl font-heading font-black text-white leading-tight italic tracking-tight">
                                No exact match found yet
                            </h3>

                            <p className="text-slate-400 font-medium leading-relaxed">
                                We couldn't find someone directly matching all your preferences.
                                <br />
                                <span className="text-white">Would you like to search based on personality similarity instead?</span>
                            </p>

                            <div className="flex flex-col gap-4 pt-4">
                                <button
                                    onClick={() => handleRelaxDecision(true)}
                                    className="btn-primary w-full py-4 text-sm tracking-widest uppercase font-black"
                                >
                                    Yes, find similar personality
                                </button>
                                <button
                                    onClick={() => handleRelaxDecision(false)}
                                    className="w-full py-4 rounded-2xl bg-white/5 text-slate-400 font-black uppercase tracking-widest text-[10px] border border-white/5 hover:bg-white/10 transition-all"
                                >
                                    No, keep searching
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MatchingQueue;
