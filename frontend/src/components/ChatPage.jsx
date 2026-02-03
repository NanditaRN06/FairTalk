import { useState, useEffect, useRef } from "react";

export default function ChatPage({ deviceId, handoffPayload, onLeaveChat }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [connected, setConnected] = useState(false);
    const [partnerId, setPartnerId] = useState(null);
    const [matchId, setMatchId] = useState(null);
    const ws = useRef(null);

    // Storage key for conversationsgit
    const storageKey = `chat_${deviceId}`;

    useEffect(() => {
        // Load messages from localStorage when component mounts
        const savedMessages = localStorage.getItem(storageKey);
        if (savedMessages) {
            try {
                setMessages(JSON.parse(savedMessages));
            } catch (e) {
                console.error("Failed to load messages from storage:", e);
            }
        }

        // Connect to WebSocket with device ID
        connectWebSocket();

        return () => {
            if (ws.current) ws.current.close();
        };
    }, [deviceId]);

    // Save messages to localStorage whenever they change
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem(storageKey, JSON.stringify(messages));
        }
    }, [messages, storageKey]);

    const connectWebSocket = () => {
        try {
            // Do not attempt to connect without a deviceId
            if (!deviceId) {
                console.warn('connectWebSocket: no deviceId yet, skipping connect');
                return;
            }

            // Connect with device ID as user identifier. Use VITE_WEBSOCKET_URL if provided and valid.
            const rawEnvWs = import.meta.env.VITE_WEBSOCKET_URL;
            console.log('VITE_WEBSOCKET_URL=', rawEnvWs);
            let base = null;
            if (rawEnvWs && typeof rawEnvWs === 'string' && rawEnvWs !== 'undefined') {
                try {
                    // Validate URL by attempting to construct it
                    // new URL accepts ws/wss as well
                    /* eslint-disable no-new */
                    new URL(rawEnvWs);
                    /* eslint-enable no-new */
                    base = rawEnvWs.replace(/\/$/, '');
                } catch (e) {
                    console.warn('VITE_WEBSOCKET_URL is invalid, falling back to current host:', rawEnvWs);
                    base = null;
                }
            }

            if (!base) {
                base = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`;
            }

            // Normalize base: remove accidental 'undefined' and trailing slash issues
            if (base.includes('undefined')) {
                base = base.replace(/undefined/g, 'ws');
            }
            base = base.replace(/\/$/, '');

            const separator = base.includes('?') ? '&' : '?';
            const wsUrl = `${base}${separator}userId=${encodeURIComponent(deviceId)}`;
            console.log('Final WebSocket URL:', wsUrl);
            console.log('Connecting WebSocket to', wsUrl);
            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                setConnected(true);
                console.log("WebSocket connected with device ID:", deviceId);
                
                // Send location if available
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((pos) => {
                        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                            ws.current.send(JSON.stringify({
                                type: "location",
                                payload: {
                                    latitude: pos.coords.latitude,
                                    longitude: pos.coords.longitude,
                                    city: "User Location",
                                    country: "User Country"
                                }
                            }));
                        }
                    });
                }
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleWebSocketMessage(data);
                } catch (error) {
                    console.error("Error parsing WebSocket message:", error);
                }
            };

            ws.current.onerror = (error) => {
                console.error("WebSocket error:", error);
                setConnected(false);
            };

            ws.current.onclose = () => {
                setConnected(false);
                console.log("WebSocket disconnected");
            };
        } catch (error) {
            console.error("Failed to connect to WebSocket:", error);
            setConnected(false);
        }
    };

    const handleWebSocketMessage = (data) => {
        const { type, ...rest } = data;

        switch (type) {
            case "match_found":
                console.log("Match found:", rest);
                setMatchId(rest.matchId);
                setPartnerId(rest.partner.userId);
                setMessages((prev) => [
                    ...prev,
                    { from: "system", text: `Match found with ${rest.partner.userId}! 🎉` }
                ]);
                break;

            case "match_started":
                console.log("Match started:", rest);
                setMatchId(rest.matchId);
                setPartnerId(rest.partnerId);
                setMessages((prev) => [
                    ...prev,
                    { from: "system", text: "Chat started! You can now message." }
                ]);
                break;

            case "chat":
                setMessages((prev) => [
                    ...prev,
                    { from: rest.from, text: rest.message, timestamp: rest.timestamp }
                ]);
                break;

            case "partner_left":
                setMessages((prev) => [
                    ...prev,
                    { from: "system", text: "Partner left the chat" }
                ]);
                setConnected(false);
                break;

            case "partner_disconnected":
                setMessages((prev) => [
                    ...prev,
                    { from: "system", text: "Partner disconnected" }
                ]);
                break;

            case "error":
                setMessages((prev) => [
                    ...prev,
                    { from: "system", text: `Error: ${rest.message}` }
                ]);
                break;

            default:
                console.log("Unknown message type:", type);
        }
    };

    const sendMessage = () => {
        if (!input.trim() || !ws.current || ws.current.readyState !== WebSocket.OPEN || !matchId) {
            return;
        }

        // Send via WebSocket
        ws.current.send(JSON.stringify({
            type: "chat",
            payload: { text: input }
        }));

        // Add to local messages
        setMessages((prev) => [
            ...prev,
            { from: "you", text: input, timestamp: Date.now() }
        ]);

        setInput("");
    };

    const handleLeave = () => {
        // Send leave message through WebSocket
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: "leave_chat" }));
            ws.current.close();
        }

        // Clear local storage for this conversation
        localStorage.removeItem(storageKey);

        // Reset state
        setMessages([]);
        setConnected(false);
        setMatchId(null);
        setPartnerId(null);

        // Call parent callback
        if (onLeaveChat) {
            onLeaveChat();
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-xl p-6 space-y-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-green-400">FairTalk Chat</h1>
                    <p className="text-xs text-gray-500 mt-1">Device ID: {deviceId.substring(0, 12)}...</p>
                </div>

                <div className="flex items-center gap-2">
                    <div
                        className={`w-3 h-3 rounded-full ${
                            connected ? "bg-green-500 animate-pulse" : "bg-red-500"
                        }`}
                    ></div>
                    <span className="text-gray-300 text-sm">
                        {connected ? "Connected" : "Disconnected"}
                    </span>
                    {partnerId && (
                        <span className="ml-auto text-xs text-blue-400">
                            With: {partnerId.substring(0, 8)}...
                        </span>
                    )}
                </div>

                <div className="h-64 bg-gray-700 rounded-lg overflow-y-auto p-4 space-y-2">
                    {messages.length === 0 ? (
                        <p className="text-gray-400 text-center text-sm">
                            No messages yet. Waiting for match...
                        </p>
                    ) : (
                        messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`p-3 rounded-lg text-sm ${
                                    msg.from === "you"
                                        ? "bg-blue-600 text-white text-right ml-auto max-w-xs"
                                        : msg.from === "system"
                                        ? "bg-yellow-900/50 text-yellow-300 text-center text-xs"
                                        : "bg-gray-600 text-white mr-auto max-w-xs"
                                }`}
                            >
                                {msg.from !== "you" && msg.from !== "system" && (
                                    <p className="text-xs font-semibold text-gray-300 mb-1">
                                        {msg.from.substring(0, 8)}...
                                    </p>
                                )}
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
                        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                        placeholder={matchId ? "Type a message..." : "Waiting for match..."}
                        className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!connected || !matchId}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!connected || !matchId}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        Send
                    </button>
                </div>

                <button
                    onClick={handleLeave}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                >
                    Leave Chat (Clear Conversation)
                </button>
            </div>
        </div>
    );
}
