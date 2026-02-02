import { useState, useEffect, useRef } from "react";

export default function ChatPage() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [connected, setConnected] = useState(false);
    const ws = useRef(null);

    useEffect(() => {
        const matchId = "match-123";
        const deviceId = "device-" + Math.random().toString(36).substr(2, 9);
        
        ws.current = new WebSocket(
            `ws://localhost:5000/ws/chat/${matchId}/${deviceId}`
        );

        ws.current.onopen = () => {
            setConnected(true);
            console.log("WebSocket connected");
        };

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "message") {
                setMessages((prev) => [
                    ...prev,
                    { from: data.from, text: data.text },
                ]);
            } else if (data.type === "system" && data.event === "partner_left") {
                setMessages((prev) => [
                    ...prev,
                    { from: "system", text: "Partner left the chat" },
                ]);
                setConnected(false);
            }
        };

        ws.current.onerror = (error) => {
            console.error("WebSocket error:", error);
            setConnected(false);
        };

        return () => {
            if (ws.current) ws.current.close();
        };
    }, []);

    const sendMessage = () => {
        if (input.trim() && ws.current && connected) {
            ws.current.send(
                JSON.stringify({
                    action: "message",
                    text: input,
                })
            );
            setMessages((prev) => [...prev, { from: "you", text: input }]);
            setInput("");
        }
    };

    const handleLeave = () => {
        if (ws.current) {
            ws.current.send(JSON.stringify({ action: "leave" }));
            ws.current.close();
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-xl p-6 space-y-4">
                <h1 className="text-2xl font-bold text-green-400 text-center">
                    FairTalk Chat
                </h1>

                <div className="flex items-center gap-2">
                    <div
                        className={`w-3 h-3 rounded-full ${
                            connected ? "bg-green-500" : "bg-red-500"
                        }`}
                    ></div>
                    <span className="text-gray-300 text-sm">
                        {connected ? "Connected" : "Disconnected"}
                    </span>
                </div>

                <div className="h-64 bg-gray-700 rounded-lg overflow-y-auto p-4 space-y-2">
                    {messages.length === 0 ? (
                        <p className="text-gray-400 text-center">
                            No messages yet
                        </p>
                    ) : (
                        messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`p-2 rounded ${
                                    msg.from === "you"
                                        ? "bg-blue-600 text-white text-right"
                                        : msg.from === "system"
                                        ? "bg-yellow-600 text-white text-center"
                                        : "bg-gray-600 text-white"
                                }`}
                            >
                                {msg.text}
                            </div>
                        ))
                    )}
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) =>
                            e.key === "Enter" && sendMessage()
                        }
                        placeholder="Type a message..."
                        className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!connected}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!connected}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Send
                    </button>
                </div>

                <button
                    onClick={handleLeave}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                    Leave Chat
                </button>
            </div>
        </div>
    );
}
