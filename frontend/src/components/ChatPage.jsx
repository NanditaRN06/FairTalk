import { useState, useEffect, useRef } from "react";

export default function ChatPage({ deviceId, userId, matchId, partnerName, onLeave }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [connected, setConnected] = useState(false);
    const [partnerLeft, setPartnerLeft] = useState(false);
    const [vibeLevel, setVibeLevel] = useState(15);

    const ws = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!userId || !matchId) return;

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const url = `${protocol}//${window.location.hostname}:9000/ws/chat?matchId=${matchId}&userId=${userId}&deviceId=${deviceId}`;

        ws.current = new WebSocket(url);

        ws.current.onopen = () => {
            setConnected(true);
            console.log("Connected to chat session:", matchId);
        };

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === "ping") return;

            if (data.type === "system" && data.event === "partner_left") {
                setPartnerLeft(true);
            } else if (data.type === "message") {
                setMessages((prev) => [...prev, { text: data.text, sender: partnerName, type: "incoming" }]);
                setVibeLevel(prev => Math.min(prev + 5, 100));
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
        setVibeLevel(prev => Math.min(prev + 5, 100));

        setInput("");
    };

    const handleExit = () => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ action: "leave" }));
        }
        onLeave();
    };

    useEffect(() => {
        if (!connected || partnerLeft) return;
        const interval = setInterval(() => {
            setVibeLevel(prev => Math.max(prev - 0.5, 10));
        }, 2000);
        return () => clearInterval(interval);
    }, [connected, partnerLeft]);

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
                    reporterId: deviceId,
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
                handleExit();
            }, 2000);
        } catch (e) {
            console.error("Report failed", e);
        }
    };

    const maskedName = partnerName ? `${partnerName.charAt(0).toUpperCase()}****` : "Stranger";

    const getVibeColor = () => {
        if (vibeLevel > 80) return 'bg-vibrant-rose shadow-[0_0_15px_#F43F5E]';
        if (vibeLevel > 50) return 'bg-brand-secondary shadow-[0_0_15px_#8B5CF6]';
        return 'bg-brand-primary shadow-[0_0_15px_#6366F1]';
    };

    const getVibeStatus = () => {
        if (vibeLevel > 80) return 'Electrified 🔥';
        if (vibeLevel > 50) return 'Vibrant ✨';
        return 'Chillin 🧊';
    };

    return (
        <div className="min-h-screen bg-surface-darkest flex flex-col items-center justify-center p-4 lg:p-10 relative overflow-hidden font-sans">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute -top-1/4 -left-1/4 w-full h-full rounded-full blur-[160px] opacity-20 transition-colors duration-1000 ${vibeLevel > 70 ? 'bg-brand-accent' : 'bg-brand-primary'}`}></div>
                <div className={`absolute -bottom-1/4 -right-1/4 w-full h-full rounded-full blur-[160px] opacity-10 transition-colors duration-1000 ${vibeLevel > 50 ? 'bg-brand-secondary' : 'bg-brand-primary'}`}></div>
            </div>

            <div className="w-full max-w-5xl glass-card rounded-[3rem] flex flex-col h-[85vh] relative overflow-hidden z-10 shadow-2xl border-white/5">

                <div className="h-1.5 w-full bg-white/5 relative overflow-hidden">
                    <div
                        className={`h-full transition-all duration-1000 ease-out ${getVibeColor()}`}
                        style={{ width: `${vibeLevel}%` }}
                    />
                </div>

                <div className="bg-white/5 backdrop-blur-xl px-6 py-5 flex justify-between items-center border-b border-white/5">
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-heading font-black text-2xl text-white shadow-xl transition-all duration-500 transform ${vibeLevel > 80 ? 'bg-brand-accent rotate-0' : 'bg-gradient-to-br from-brand-primary to-brand-secondary rotate-3'}`}>
                                {maskedName.charAt(0)}
                            </div>
                            <div className="absolute -bottom-1 -right-1 p-1 bg-surface-dark rounded-full">
                                <div className={`w-3 h-3 rounded-full ${connected && !partnerLeft ? "bg-vibrant-emerald animate-pulse shadow-[0_0_8px_#10B981]" : "bg-rose-500"}`}></div>
                            </div>
                        </div>
                        <div>
                            <h1 className="text-xl font-heading font-black text-white tracking-tight uppercase">
                                {maskedName}
                            </h1>
                            <div className="flex items-center gap-3">
                                <span className={`text-[10px] uppercase font-black tracking-widest transition-colors ${vibeLevel > 80 ? 'text-vibrant-rose' : 'text-slate-500'}`}>
                                    {getVibeStatus()}
                                </span>
                                <div className="h-1 w-1 bg-slate-700 rounded-full"></div>
                                <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none">
                                    {partnerLeft ? "Terminated" : connected ? "Connected" : "Offline"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowReportModal(true)}
                            title="Report conversation partner"
                            className="p-3 text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 rounded-xl transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </button>
                        <button
                            onClick={handleExit}
                            className="bg-vibrant-rose/10 hover:bg-vibrant-rose text-vibrant-rose hover:text-white px-5 py-2.5 rounded-2xl border border-vibrant-rose/20 transition-all font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-vibrant-rose/5"
                        >
                            End Session
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/[0.02] to-transparent">
                    {messages.length === 0 && !partnerLeft && (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-8 animate-fade-in">
                            <div className="w-28 h-28 bg-white/5 rounded-full flex items-center justify-center text-6xl shadow-inner border border-white/5 relative group">
                                <div className="absolute inset-0 bg-brand-primary blur-3xl opacity-0 group-hover:opacity-20 transition-opacity"></div>
                                🌌
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-3xl font-heading font-black text-white italic tracking-tighter">THE SPACE IS OPEN</h3>
                                <p className="text-slate-400 font-medium max-w-xs mx-auto text-sm leading-relaxed uppercase tracking-widest opacity-60">
                                    You are now synced with <span className="text-white">{maskedName}</span>.
                                    <br />Frequency check: Positive.
                                </p>
                            </div>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex flex-col ${msg.type === "outgoing" ? "items-end" : "items-start"} animate-fade-in group`}>
                            <div className={`px-6 py-4 rounded-[1.75rem] max-w-[85%] md:max-w-[70%] text-[15px] font-medium leading-relaxed shadow-xl transform transition-transform duration-200 hover:scale-[1.01] ${msg.type === "outgoing"
                                ? "bg-gradient-to-br from-brand-primary to-brand-secondary text-white rounded-tr-none shadow-brand-primary/20"
                                : "bg-white/5 border border-white/5 text-slate-100 rounded-tl-none shadow-black/20 backdrop-blur-sm"
                                }`}>
                                {msg.text}
                            </div>
                            <div className={`mt-2 px-2 flex items-center gap-2 opacity-30 group-hover:opacity-100 transition-opacity duration-300`}>
                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${msg.type === "outgoing" ? "text-brand-primary" : "text-slate-500"}`}>
                                    {msg.sender === "You" ? "You" : maskedName}
                                </span>
                            </div>
                        </div>
                    ))}

                    {partnerLeft && (
                        <div className="flex justify-center my-10">
                            <div className="glass-card px-8 py-4 rounded-3xl border-rose-500/20 bg-rose-500/5 text-rose-400 text-xs font-black uppercase tracking-[0.3em] flex items-center gap-4 animate-pulse shadow-2xl">
                                <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                Connection Terminated
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-8 bg-black/20 backdrop-blur-2xl border-t border-white/5">
                    <div className="flex gap-4 items-end max-w-4xl mx-auto">
                        <div className="flex-1 relative group bg-white/5 rounded-[2rem] p-1 border border-white/5 focus-within:border-brand-primary/40 focus-within:bg-white/10 transition-all duration-500">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }}
                                placeholder={partnerLeft ? "Signal lost..." : "Transmit message..."}
                                disabled={partnerLeft}
                                rows={1}
                                className="w-full bg-transparent text-white placeholder-slate-600 px-6 py-4 focus:outline-none text-base resize-none disabled:opacity-50 font-medium overflow-hidden"
                                style={{ height: 'auto', minHeight: '56px' }}
                            />
                        </div>
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || partnerLeft}
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 transform ${input.trim() && !partnerLeft
                                ? "bg-gradient-to-br from-brand-primary to-brand-secondary text-white shadow-[0_10px_25px_rgba(99,102,241,0.4)] hover:scale-110 active:scale-90"
                                : "bg-white/5 text-slate-700 cursor-not-allowed border border-white/5"
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 rotate-[-15deg] group-hover:rotate-0 transition-transform">
                                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                            </svg>
                        </button>
                    </div>
                    <div className="text-center mt-4">
                        <span className="text-[10px] font-black text-slate-600 tracking-[0.2em] uppercase">Private Encryption Active</span>
                    </div>
                </div>

                {showReportModal && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-surface-darkest/80 backdrop-blur-md p-4 animate-fade-in">
                        <div className="glass-card bg-surface-card border border-white/5 rounded-[3rem] w-full max-w-md p-10 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-vibrant-rose opacity-10 rounded-full blur-[80px]"></div>

                            {!reportSubmitted ? (
                                <>
                                    <div className="mb-8 relative z-10">
                                        <h3 className="text-3xl font-heading font-black text-white mb-2 italic">SIGNAL REPORT</h3>
                                        <p className="text-sm text-slate-400 font-medium">Protect the frequency. This report is 100% anonymous.</p>
                                    </div>

                                    <div className="space-y-3 mb-10 relative z-10 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                        {reportOptions.map((opt) => (
                                            <label key={opt.id} className={`flex items-center p-4 rounded-2xl border cursor-pointer transition-all duration-300 group ${reportReason === opt.id
                                                ? "bg-rose-500/10 border-rose-500 text-white"
                                                : "bg-white/5 border-transparent text-slate-400 hover:bg-white/10 hover:text-slate-100"
                                                }`}>
                                                <input
                                                    type="radio"
                                                    name="reason"
                                                    value={opt.id}
                                                    checked={reportReason === opt.id}
                                                    onChange={(e) => setReportReason(e.target.value)}
                                                    className="hidden"
                                                />
                                                <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center transition-colors ${reportReason === opt.id ? "border-rose-500" : "border-slate-700"
                                                    }`}>
                                                    {reportReason === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />}
                                                </div>
                                                <span className="text-sm font-bold uppercase tracking-widest">{opt.label}</span>
                                            </label>
                                        ))}

                                        {reportReason === "other" && (
                                            <textarea
                                                className="w-full bg-black/20 border border-white/10 rounded-2xl p-5 text-sm text-white focus:border-rose-500/50 focus:outline-none resize-none h-28 mt-4 transition-all placeholder-slate-700"
                                                placeholder="Provide details..."
                                                value={customReportReason}
                                                onChange={(e) => setCustomReportReason(e.target.value)}
                                            />
                                        )}
                                    </div>

                                    <div className="flex gap-4 relative z-10">
                                        <button
                                            onClick={() => setShowReportModal(false)}
                                            className="flex-1 py-4 rounded-2xl bg-white/5 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                                        >
                                            Discard
                                        </button>
                                        <button
                                            onClick={handleReportSubmit}
                                            disabled={!reportReason || (reportReason === "other" && !customReportReason.trim())}
                                            className="flex-1 py-4 rounded-2xl bg-vibrant-rose text-white font-black text-xs uppercase tracking-widest hover:shadow-xl hover:shadow-rose-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Submit Report
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-12 relative z-10">
                                    <div className="w-24 h-24 bg-vibrant-emerald/10 text-vibrant-emerald rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-8 border border-vibrant-emerald/20 shadow-inner">
                                        ✓
                                    </div>
                                    <h3 className="text-3xl font-heading font-black text-white mb-4 italic">SIGNAL RECEIVED</h3>
                                    <p className="text-slate-400 font-medium text-sm">
                                        Frequency updated. Thank you for your contribution to the space safety.
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