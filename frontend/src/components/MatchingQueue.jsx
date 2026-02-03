import { useState, useEffect } from "react";

const MatchingQueue = ({ deviceId, profileData, onMatchFound }) => {
    const [status, setStatus] = useState("initializing");
    const [dots, setDots] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
        }, 500);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const socket = new WebSocket(`ws://${window.location.hostname}:5000/ws/queue`);

        socket.onopen = () => {
            console.log("Connected to matching queue");
            socket.send(JSON.stringify({
                type: "join_queue",
                payload: {
                    deviceId,
                    nickname: profileData.nickname,
                    bio: profileData.bio,
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
                setTimeout(() => {
                    onMatchFound(data.match);
                }, 1500);
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
    }, [deviceId, profileData, onMatchFound]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
            <div className="w-full max-w-md bg-gray-800 rounded-3xl p-10 border border-gray-700 shadow-2xl text-center space-y-8 relative overflow-hidden">
                {/* Decorative background elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse" />

                <div className="space-y-4">
                    <div className="relative inline-block">
                        <div className="w-24 h-24 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center font-bold text-blue-400">
                            {status === "matched" ? "✓" : "⚡"}
                        </div>
                    </div>

                    <h2 className="text-3xl font-extrabold tracking-tight">
                        {status === "matched" ? "Match Found!" : "Finding your match"}
                        {status !== "matched" && <span>{dots}</span>}
                    </h2>

                    <p className="text-gray-400 text-sm">
                        {status === "searching"
                            ? "Analyzing personality profiles for the perfect connection..."
                            : status === "matched"
                                ? "Initializing secure chat session..."
                                : "Connecting to matching server..."}
                    </p>
                </div>

                <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-700/50 space-y-3">
                    <div className="flex justify-between items-center text-xs text-gray-500 uppercase font-semibold">
                        <span>Your Identity</span>
                        <span className="text-blue-400">Live</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-xl shadow-lg">
                            {profileData.nickname.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                            <div className="text-white font-bold">{profileData.nickname}</div>
                            <div className="text-gray-400 text-xs truncate max-w-[200px]">
                                {profileData.bio || "No bio set"}
                            </div>
                        </div>
                    </div>
                </div>

                {status === "searching" && (
                    <div className="animate-pulse text-xs text-gray-500">
                        Stay on this page to remain in the queue
                    </div>
                )}
            </div>
        </div>
    );
};

export default MatchingQueue;
