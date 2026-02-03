import { useState, useEffect, useRef } from "react";

export default function ChatPage({ deviceId }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [targetDeviceId, setTargetDeviceId] = useState("");
    const [connected, setConnected] = useState(false);
    const ws = useRef(null);
    const messagesEndRef = useRef(null);

    const SERVER_URL = "wss://websocket-server-ihw6.onrender.com/ws";

    useEffect(() => {
        if (!deviceId) return;

        console.log("Connecting to WebSocket with Device ID:", deviceId);
        ws.current = new WebSocket(SERVER_URL);

        ws.current.onopen = () => {
            console.log("WebSocket Connected");
            setConnected(true);
            const text = JSON.stringify({ device_id: deviceId });
            ws.current.send(text);
        };

        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("Received:", data);
                if (data.device_id && data.message) {
                    setMessages((prev) => [
                        ...prev,
                        { sender: data.device_id, text: data.message, type: 'incoming' }
                    ]);
                }
            } catch (e) {
                console.error("Failed to parse incoming message:", e);
            }
        };

        ws.current.onclose = () => {
            console.log("WebSocket Disconnected");
            setConnected(false);
        };

        ws.current.onerror = (error) => {
            console.error("WebSocket Error:", error);
        };

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [deviceId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = () => {
        if (!input.trim() || !targetDeviceId.trim()) return;
        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
            alert("Not connected to server");
            return;
        }

        const payload = {
            device_id: deviceId,
            to: targetDeviceId,
            message: input
        };

        console.log("Sending:", payload);
        ws.current.send(JSON.stringify(payload));

        setMessages((prev) => [
            ...prev,
            { sender: "You", text: input, type: 'outgoing' }
        ]);
        setInput("");
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 font-sans">
            <div className="w-full max-w-2xl bg-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col h-[80vh]">

                <div className="bg-gray-700 p-4 border-b border-gray-600 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold text-green-400">Secure P2P Chat</h1>
                        <p className="text-xs text-gray-400">Your Device ID: <span className="font-mono text-white select-all">{deviceId}</span></p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${connected ? "bg-green-500" : "bg-red-500 animate-pulse"}`}></div>
                        <span className="text-sm font-medium">{connected ? "Online" : "Offline"}</span>
                    </div>
                </div>

                <div className="p-4 bg-gray-750 border-b border-gray-600">
                    <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Target Device ID</label>
                    <input
                        type="text"
                        value={targetDeviceId}
                        onChange={(e) => setTargetDeviceId(e.target.value)}
                        placeholder="Paste partner's device ID here..."
                        className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-green-500 transition-colors font-mono"
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-800">
                    {messages.length === 0 && (
                        <div className="text-center text-gray-500 mt-10">
                            <p>No messages yet.</p>
                            <p className="text-sm">Enter a Target Device ID to start chatting.</p>
                        </div>
                    )}
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex flex-col ${msg.type === 'outgoing' ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[80%] px-4 py-2 rounded-lg break-words ${msg.type === 'outgoing'
                                ? 'bg-green-600 text-white rounded-br-none'
                                : 'bg-gray-700 text-gray-100 rounded-bl-none'
                                }`}>
                                {msg.text}
                            </div>
                            <span className="text-[10px] text-gray-500 mt-1 font-mono">
                                {msg.type === 'outgoing' ? 'You' : msg.sender}
                            </span>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-gray-700">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                            placeholder="Type a message..."
                            className="flex-1 bg-gray-900 border border-gray-600 rounded px-4 py-2 text-white focus:outline-none focus:border-green-500 transition-colors"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!connected || !targetDeviceId}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded transition-colors"
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-4 text-xs text-gray-500 max-w-md text-center">
                <p>Native WebSocket Implementation</p>
                <p>Protocol: JSON | No Rooms | Direct Routing</p>
            </div>
        </div>
    );
}

