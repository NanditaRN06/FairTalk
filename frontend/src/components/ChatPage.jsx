import { useState, useEffect, useRef } from "react";

export default function ChatPage({ deviceId, matchId, partnerName, onLeave }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [connected, setConnected] = useState(false);
    const [partnerLeft, setPartnerLeft] = useState(false);

    const ws = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!deviceId || !matchId) return;

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const url = `${protocol}//${window.location.hostname}:5000/ws/chat?matchId=${matchId}&deviceId=${deviceId}`;

        ws.current = new WebSocket(url);

        ws.current.onopen = () => {
            setConnected(true);
            console.log("Connected to chat session:", matchId);
        };

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === "message") {
                setMessages(prev => [
                    ...prev,
                    {
                        sender: partnerName,
                        text: data.text,
                        type: "incoming"
                    }
                ]);
            } else if (data.type === "system" && data.event === "partner_left") {
                setPartnerLeft(true);
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

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center p-4">
            <div className="w-full max-w-2xl bg-gray-900 rounded-3xl shadow-2xl flex flex-col h-[85vh] border border-gray-800 relative overflow-hidden">

                {/* Header */}
                <div className="bg-gray-800/50 backdrop-blur-md p-5 flex justify-between items-center border-b border-gray-800">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center font-bold text-white">
                            {partnerName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">{partnerName}</h1>
                            <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${connected && !partnerLeft ? "bg-green-500" : "bg-red-500"}`} />
                                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
                                    {partnerLeft ? "Disconnected" : connected ? "Active Session" : "Offline"}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onLeave}
                        className="text-xs bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2 rounded-xl border border-red-500/20 transition-all font-bold uppercase tracking-wider"
                    >
                        End Chat
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {messages.length === 0 && !partnerLeft && (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center text-2xl">👋</div>
                            <div className="text-gray-500 text-sm italic">Matched! Say hello to {partnerName}...</div>
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
                                {msg.sender}
                            </span>
                        </div>
                    ))}

                    {partnerLeft && (
                        <div className="bg-red-950/20 border border-red-900/30 text-red-400 text-center py-3 rounded-2xl text-xs font-semibold animate-pulse">
                            ⚠️ {partnerName} has left the conversation.
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-5 bg-gray-900 border-t border-gray-800">
                    <div className="flex gap-3 bg-gray-800 p-2 rounded-2xl border border-gray-700">
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && sendMessage()}
                            placeholder={partnerLeft ? "Chat ended" : "Send a message..."}
                            className="flex-1 bg-transparent border-none rounded-xl px-4 py-2 text-sm focus:outline-none placeholder-gray-500 text-white"
                            disabled={!connected || partnerLeft}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!connected || !input.trim() || partnerLeft}
                            className={`px-5 py-2 rounded-xl transition-all font-bold text-xs uppercase ${!input.trim() || !connected || partnerLeft
                                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                                    : "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/40"
                                }`}
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}