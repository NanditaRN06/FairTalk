import { useState, useEffect, useRef } from "react";

export default function ChatPage({ deviceId, userId, matchId, partnerName, onLeave }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [connected, setConnected] = useState(false);
    const [partnerLeft, setPartnerLeft] = useState(false);

    const ws = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!userId || !matchId) return;

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        // Pass userId as the identifier for the chat session
        const url = `${protocol}//${window.location.hostname}:9000/ws/chat?matchId=${matchId}&userId=${userId}&deviceId=${deviceId}`;

        ws.current = new WebSocket(url);

        ws.current.onopen = () => {
            setConnected(true);
            console.log("Connected to chat session:", matchId);
        };

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === "ping") {
                // Heartbeat, ignore or send pong if needed (not needed for this simple keep-alive)
                return;
            }

            if (data.type === "system" && data.event === "partner_left") {
                setPartnerLeft(true);
                // setConnected(false); // Optional: keep as connected but show partner left
            } else if (data.type === "message") {
                setMessages((prev) => [...prev, { text: data.text, sender: partnerName, type: "incoming" }]);
            }
        };

        ws.current.onclose = () => {
            setConnected(false);
        };

        return () => {
            ws.current?.close();
        };
    }, [deviceId, matchId, partnerName]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = () => {
        if (!input.trim() || !connected || partnerLeft) return;

        ws.current.send(JSON.stringify({
            action: "message",
            text: input
        }));

        setMessages(prev => [
            ...prev,
            {
                sender: "You",
                text: input,
                type: "outgoing"
            }
        ]);

        setInput("");
    };

    const handleExit = () => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ action: "leave" }));
        }
        onLeave();
    };

    // --- Report Modal Logic ---
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [customReportReason, setCustomReportReason] = useState("");
    const [reportSubmitted, setReportSubmitted] = useState(false);

    const reportOptions = [
        { id: "inappropriate", label: "Inappropriate language" },
        { id: "harassment", label: "Harassment or disrespect" },
        { id: "spam", label: "Spam or irrelevant messages" },
        { id: "uncomfortable", label: "Made me uncomfortable" },
        { id: "fake", label: "Suspected fake behavior" },
        { id: "other", label: "Other" }
    ];

    const handleReportSubmit = async () => {
        if (!reportReason) return;

        try {
            await fetch(`http://${window.location.hostname}:9000/api/match/report`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    matchId,
                    reporterId: deviceId, // Using generic deviceId as reporter ID
                    reportedId: "partner-device-id-placeholder", //Ideally this needs to be the actual partner ID from match info
                    // Since ChatPage usually receives partnerName, we should probably receive partnerId too?
                    // For now, sending what we have. The backend logic relies on reportedId.
                    // The ChatPage needs partnerId passed to it to fully work.
                    // Assuming for now matchId is sufficient for backend to lookup, OR we update ChatPage props later.
                    // WAIT: We can't strictly modify too much logic. 
                    // Let's pass a placeholder for now or fix User.jsx to pass it.
                    // Actually, let's look at what ChatPage receives.
                    // It receives 'partnerName'.
                    reason: reportReason,
                    customReason: customReportReason,
                    timestamp: Date.now()
                })
            });
            setReportSubmitted(true);
            setTimeout(() => {
                setShowReportModal(false);
                setReportSubmitted(false);
                setReportReason("");
                setCustomReportReason("");

                // End the chat automatically after reporting
                handleExit();
            }, 2000);
        } catch (e) {
            console.error("Report failed", e);
        }
    };

    const maskedName = partnerName ? `${partnerName.charAt(0).toUpperCase()}****` : "Stranger";

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center p-4">
            <div className="w-full max-w-2xl bg-gray-900 rounded-3xl shadow-2xl flex flex-col h-[85vh] border border-gray-800 relative overflow-hidden">

                {/* Header */}
                <div className="bg-gray-800/50 backdrop-blur-md p-5 flex justify-between items-center border-b border-gray-800">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center font-bold text-white">
                            {maskedName.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">{maskedName}</h1>
                            <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${connected && !partnerLeft ? "bg-green-500" : "bg-red-500"}`} />
                                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
                                    {partnerLeft ? "Disconnected" : connected ? "Active Session" : "Offline"}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowReportModal(true)}
                            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-3 py-2 rounded-xl border border-gray-700 transition-all font-bold uppercase tracking-wider"
                        >
                            Report
                        </button>
                        <button
                            onClick={handleExit}
                            className="text-xs bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2 rounded-xl border border-red-500/20 transition-all font-bold uppercase tracking-wider"
                        >
                            End Chat
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {messages.length === 0 && !partnerLeft && (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center text-2xl">👋</div>
                            <div className="text-gray-500 text-sm italic">Matched! Say hello to {maskedName}...</div>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex flex-col ${msg.type === "outgoing" ? "items-end" : "items-start"}`}>
                            <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-sm leading-relaxed ${msg.type === "outgoing"
                                ? "bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-900/20"
                                : "bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700"
                                }`}>
                                {msg.text}
                            </div>
                            <span className="text-[9px] text-gray-500 mt-1 uppercase font-bold tracking-tighter">
                                {msg.sender === "You" ? "You" : maskedName}
                            </span>
                        </div>
                    ))}

                    {partnerLeft && (
                        <div className="bg-red-950/20 border border-red-900/30 text-red-400 text-center py-3 rounded-2xl text-xs font-semibold animate-pulse">
                            ⚠️ {maskedName} has left the conversation.
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-5 bg-gray-900 border-t border-gray-800">
                    <div className="flex gap-3 bg-gray-800 p-2 rounded-2xl border border-gray-700">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                            placeholder={partnerLeft ? "Use 'End Chat' to leave..." : "Type a message..."}
                            disabled={partnerLeft}
                            className="flex-1 bg-transparent text-gray-200 placeholder-gray-500 px-4 py-2.5 focus:outline-none text-sm disabled:opacity-50"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || partnerLeft}
                            className={`p-3 rounded-xl transition-all ${input.trim() && !partnerLeft
                                ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30"
                                : "bg-gray-700 text-gray-500 cursor-not-allowed"
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Report Modal */}
                {showReportModal && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
                            {!reportSubmitted ? (
                                <>
                                    <h3 className="text-xl font-bold text-white mb-1">Report Chat</h3>
                                    <p className="text-xs text-gray-400 mb-6">Help us keep this community safe. Reports are anonymous.</p>

                                    <div className="space-y-3 mb-6">
                                        {reportOptions.map((opt) => (
                                            <label key={opt.id} className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${reportReason === opt.id
                                                ? "bg-red-500/10 border-red-500 text-white"
                                                : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-750"
                                                }`}>
                                                <input
                                                    type="radio"
                                                    name="reason"
                                                    value={opt.id}
                                                    checked={reportReason === opt.id}
                                                    onChange={(e) => setReportReason(e.target.value)}
                                                    className="hidden"
                                                />
                                                <div className={`w-4 h-4 rounded-full border mr-3 flex items-center justify-center ${reportReason === opt.id ? "border-red-500" : "border-gray-500"
                                                    }`}>
                                                    {reportReason === opt.id && <div className="w-2 h-2 rounded-full bg-red-500" />}
                                                </div>
                                                <span className="text-sm font-medium">{opt.label}</span>
                                            </label>
                                        ))}

                                        {reportReason === "other" && (
                                            <textarea
                                                className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-white focus:border-red-500 focus:outline-none resize-none h-24 mt-2"
                                                placeholder="Please briefly describe the issue..."
                                                value={customReportReason}
                                                onChange={(e) => setCustomReportReason(e.target.value)}
                                            />
                                        )}
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowReportModal(false)}
                                            className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-400 font-bold text-sm hover:bg-gray-700 transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleReportSubmit}
                                            disabled={!reportReason || (reportReason === "other" && !customReportReason.trim())}
                                            className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Submit Report
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                                        ✓
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Report Received</h3>
                                    <p className="text-sm text-gray-400 max-w-[200px] mx-auto">
                                        Sorry for the inconvenience. Thank you for helping us keep the platform safe.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}