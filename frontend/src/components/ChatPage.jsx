import { useState, useEffect, useRef } from "react";

export default function ChatPage({ deviceId }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [targetDeviceId, setTargetDeviceId] = useState("");
    const [connected, setConnected] = useState(false);
    const [chatId, setChatId] = useState(null);

    const ws = useRef(null);
    const messagesEndRef = useRef(null);

    const SERVER_URL = import.meta.env.VITE_WEBSOCKET_URL;

    useEffect(() => {
        if (!deviceId) return;

        ws.current = new WebSocket(SERVER_URL);

        ws.current.onopen = () => {
            setConnected(true);
            ws.current.send(JSON.stringify({
                device_id: deviceId
            }));
        };

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("Received:", data);

            if (data.type === "start_chat") {
                const newChatId = data.chat_id || Date.now().toString();
                setTargetDeviceId(data.from);
                setChatId(newChatId);
                ws.current.send(JSON.stringify({
                    type: "chat_accepted",
                    to: data.from,
                    from: deviceId,
                    chat_id: newChatId
                }));
            }

            if (data.type === "chat_accepted") {
                setChatId(data.chat_id);
                setConnected(true);
            }
            if (data.type === "message" && data.message) {
                setMessages(prev => [
                    ...prev,
                    {
                        sender: data.from,
                        text: data.message,
                        type: "incoming"
                    }
                ]);
            }
        };

        ws.current.onclose = (event) => {
            console.log("WebSocket Disconnected:", event.code, event.reason);
            setConnected(false);
            setChatId(null);
        };

        return () => {
            ws.current?.close();
        };
    }, [deviceId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);
    const startChat = () => {
        if (!targetDeviceId.trim()) return;
        setMessages([]);
        ws.current.send(JSON.stringify({
            type: "start_chat",
            from: deviceId,
            to: targetDeviceId,
            chat_id: Date.now().toString()
        }));
    };
    const sendMessage = () => {
        if (!input.trim() || !chatId || !targetDeviceId) return;
        ws.current.send(JSON.stringify({
            type: "message",
            chat_id: chatId,
            from: deviceId,
            to: targetDeviceId,
            message: input
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
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4">
            <div className="w-full max-w-2xl bg-gray-800 rounded-lg shadow-xl flex flex-col h-[80vh]">
                <div className="bg-gray-700 p-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold text-green-400">Secure P2P Chat</h1>
                        <p className="text-xs text-gray-300">
                            Device ID: <span className="font-mono select-all">{deviceId}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${connected ? "bg-green-500" : "bg-red-500 animate-pulse"}`} />
                        <span className="text-sm">{connected ? "Online" : "Offline"}</span>
                    </div>
                </div>

                <div className="p-4 border-b border-gray-600">
                    <label className="text-xs uppercase text-gray-400">Target Device ID</label>
                    <div className="flex gap-2 mt-1">
                        <input
                            value={targetDeviceId}
                            onChange={e => setTargetDeviceId(e.target.value)}
                            placeholder="Paste partner device ID"
                            className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white font-mono"
                        />
                        <button
                            onClick={startChat}
                            disabled={!connected || chatId}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded"
                        >
                            {chatId ? "Chat Active" : "Start Chat"}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 && (
                        <p className="text-center text-gray-500 mt-10">
                            Start a chat to begin messaging
                        </p>
                    )}

                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex flex-col ${msg.type === "outgoing" ? "items-end" : "items-start"}`}
                        >
                            <div className={`px-4 py-2 rounded-lg max-w-[75%] ${msg.type === "outgoing"
                                ? "bg-green-600 rounded-br-none"
                                : "bg-gray-700 rounded-bl-none"
                                }`}>
                                {msg.text}
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1 font-mono">
                                {msg.sender}
                            </span>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-gray-700 flex gap-2">
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && sendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 bg-gray-900 border border-gray-600 rounded px-4 py-2"
                        disabled={!chatId}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!chatId}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 rounded"
                    >
                        Send
                    </button>
                </div>
            </div>

            <p className="text-xs text-gray-500 mt-4">
                WebSocket | Session-based chat | No rooms
            </p>
        </div>
    );
}