import { useState, useEffect, useRef } from "react";
import { MapPin, Send, LogOut } from "lucide-react";

export default function ChatPageWithLocation() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [connected, setConnected] = useState(false);
    const [matchFound, setMatchFound] = useState(false);
    const [inChat, setInChat] = useState(false);
    const [location, setLocation] = useState(null);
    const [matchId, setMatchId] = useState(null);
    const [partnerId, setPartnerId] = useState(null);
    const [partnerLocation, setPartnerLocation] = useState(null);
    const [searching, setSearching] = useState(false);
    const [userId] = useState(generateUserId());

    const ws = useRef(null);
    const messagesEndRef = useRef(null);

    // Generate unique user ID
    function generateUserId() {
        return "user-" + Math.random().toString(36).substr(2, 9);
    }

    // Get user location
    const getUserLocation = async () => {
        return new Promise((resolve) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;

                        // Get city/country from coordinates (optional)
                        try {
                            const response = await fetch(
                                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                            );
                            const data = await response.json();
                            setLocation({
                                latitude,
                                longitude,
                                city: data.address?.city || "Unknown",
                                country: data.address?.country || "Unknown",
                            });
                            resolve({ latitude, longitude, city: data.address?.city, country: data.address?.country });
                        } catch (error) {
                            console.error("Error getting location details:", error);
                            setLocation({ latitude, longitude, city: "Unknown", country: "Unknown" });
                            resolve({ latitude, longitude, city: "Unknown", country: "Unknown" });
                        }
                    },
                    (error) => {
                        console.error("Error getting location:", error);
                        resolve(null);
                    }
                );
            } else {
                console.error("Geolocation not supported");
                resolve(null);
            }
        });
    };

    // Initialize WebSocket connection
    useEffect(() => {
        const initializeConnection = async () => {
            // Get location first
            const userLocation = await getUserLocation();

            // Connect to WebSocket
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            const wsUrl = `${protocol}//${window.location.host}/ws?userId=${userId}`;

            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                setConnected(true);
                console.log("WebSocket connected");

                // Send location to server
                if (userLocation) {
                    ws.current.send(
                        JSON.stringify({
                            type: "location",
                            payload: userLocation,
                        })
                    );
                }
            };

            ws.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                handleServerMessage(data);
            };

            ws.current.onerror = (error) => {
                console.error("WebSocket error:", error);
                setConnected(false);
            };

            ws.current.onclose = () => {
                setConnected(false);
                setInChat(false);
                setMatchFound(false);
            };
        };

        initializeConnection();

        return () => {
            if (ws.current) ws.current.close();
        };
    }, []);

    // Scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleServerMessage = (data) => {
        const { type, payload } = data;

        switch (type) {
            case "connection":
                console.log("Connected to server:", data);
                break;

            case "match_found":
                setMatchFound(true);
                setMatchId(data.matchId);
                setPartnerId(data.partner.userId);
                setPartnerLocation(data.partner.location);
                setMessages([
                    {
                        type: "system",
                        text: `Match found! They are from ${data.partner.location?.city || "nearby"}. Accept the match to chat.`,
                    },
                ]);
                break;

            case "waiting_for_match":
                setSearching(true);
                setMessages([{ type: "system", text: "Looking for a match..." }]);
                break;

            case "match_started":
                setInChat(true);
                setSearching(false);
                setMessages((prev) => [
                    ...prev,
                    { type: "system", text: "Match started! You can now chat." },
                ]);
                break;

            case "chat":
                setMessages((prev) => [
                    ...prev,
                    { type: "message", from: "partner", text: data.message },
                ]);
                break;

            case "partner_left":
                setInChat(false);
                setMessages((prev) => [
                    ...prev,
                    { type: "system", text: "Partner left the chat." },
                ]);
                break;

            case "partner_disconnected":
                setInChat(false);
                setMessages((prev) => [
                    ...prev,
                    { type: "system", text: "Partner disconnected." },
                ]);
                break;

            case "match_rejected":
                setMatchFound(false);
                setMessages((prev) => [
                    ...prev,
                    { type: "system", text: "Match was rejected." },
                ]);
                break;

            case "error":
                setMessages((prev) => [...prev, { type: "error", text: data.message }]);
                break;

            default:
                console.log("Unknown message type:", type);
        }
    };

    const handleFindMatch = () => {
        if (ws.current && connected && location) {
            setSearching(true);
            ws.current.send(
                JSON.stringify({
                    type: "find_match",
                    payload: { preferences: {} },
                })
            );
        }
    };

    const handleAcceptMatch = () => {
        if (ws.current && matchId) {
            ws.current.send(
                JSON.stringify({
                    type: "accept_match",
                    payload: { matchId },
                })
            );
        }
    };

    const handleRejectMatch = () => {
        if (ws.current) {
            ws.current.send(
                JSON.stringify({
                    type: "reject_match",
                })
            );
            setMatchFound(false);
            setMatchId(null);
        }
    };

    const sendMessage = () => {
        if (input.trim() && ws.current && inChat) {
            ws.current.send(
                JSON.stringify({
                    type: "chat",
                    payload: { text: input },
                })
            );
            setMessages((prev) => [...prev, { type: "message", from: "you", text: input }]);
            setInput("");
        }
    };

    const handleLeaveChat = () => {
        if (ws.current) {
            ws.current.send(JSON.stringify({ type: "leave_chat" }));
            setInChat(false);
            setMatchFound(false);
            setMessages([]);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-gray-800 rounded-lg shadow-2xl p-6 space-y-4">
                {/* Header */}
                <div className="border-b border-gray-700 pb-4">
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 text-center">
                        FairTalk
                    </h1>
                    <p className="text-gray-400 text-center text-sm mt-2">Connect with people nearby</p>
                </div>

                {/* Status Bar */}
                <div className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                        <div
                            className={`w-3 h-3 rounded-full ${
                                connected ? "bg-green-500" : "bg-red-500"
                            } animate-pulse`}
                        ></div>
                        <span className="text-gray-300 text-sm">
                            {connected ? "Connected" : "Disconnected"}
                        </span>
                    </div>
                    {location && (
                        <div className="flex items-center gap-1 text-gray-400 text-sm">
                            <MapPin className="w-4 h-4" />
                            <span>{location.city}, {location.country}</span>
                        </div>
                    )}
                </div>

                {/* Main Content */}
                {!matchFound && !inChat && (
                    <div className="text-center space-y-4 py-8">
                        <p className="text-gray-300">
                            {searching
                                ? "Looking for a match near you..."
                                : "Ready to chat? Find someone nearby!"}
                        </p>
                        <button
                            onClick={handleFindMatch}
                            disabled={!connected || !location || searching}
                            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {searching ? "Searching..." : "Find a Match"}
                        </button>
                    </div>
                )}

                {/* Match Found - Acceptance Screen */}
                {matchFound && !inChat && (
                    <div className="bg-gray-700 rounded-lg p-6 space-y-4">
                        <h2 className="text-xl font-semibold text-green-400">Match Found! 🎉</h2>
                        {partnerLocation && (
                            <div className="flex items-center gap-2 text-gray-300">
                                <MapPin className="w-5 h-5 text-blue-400" />
                                <span>Located in {partnerLocation.city}, {partnerLocation.country}</span>
                            </div>
                        )}
                        <p className="text-gray-400 text-sm">
                            A match has been found! Would you like to start chatting?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleAcceptMatch}
                                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all"
                            >
                                Accept & Chat
                            </button>
                            <button
                                onClick={handleRejectMatch}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                )}

                {/* Chat Window */}
                {inChat && (
                    <>
                        {/* Messages */}
                        <div className="h-80 bg-gray-700 rounded-lg overflow-y-auto p-4 space-y-3">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${
                                        msg.from === "you" ? "justify-end" : "justify-start"
                                    }`}
                                >
                                    <div
                                        className={`max-w-xs px-4 py-2 rounded-lg ${
                                            msg.from === "you"
                                                ? "bg-blue-600 text-white"
                                                : msg.type === "system"
                                                ? "bg-yellow-600 text-white text-center text-sm w-full"
                                                : "bg-gray-600 text-white"
                                        }`}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                                placeholder="Type a message..."
                                className="flex-1 bg-gray-700 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                            />
                            <button
                                onClick={sendMessage}
                                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </>
                )}

                {/* Leave Button */}
                {inChat && (
                    <button
                        onClick={handleLeaveChat}
                        className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        Leave Chat
                    </button>
                )}
            </div>
        </div>
    );
}
