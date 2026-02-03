/**
 * WebSocket Client Utility for FairTalk Frontend
 * Handles all WebSocket communication with the server
 */

class FairTalkWebSocket {
    constructor(userId = null) {
        this.userId = userId || this.generateUserId();
        this.ws = null;
        this.connected = false;
        this.listeners = new Map();
        this.messageQueue = [];
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
    }

    generateUserId() {
        return 'user-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Connect to WebSocket server
     * @param {string} url - WebSocket server URL (defaults to current host)
     * @returns {Promise<void>}
     */
    connect(url = null) {
        return new Promise((resolve, reject) => {
            try {
                const wsUrl = url || this.getWebSocketUrl();
                const fullUrl = `${wsUrl}?userId=${this.userId}`;

                this.ws = new WebSocket(fullUrl);

                this.ws.onopen = () => {
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    console.log('✅ WebSocket connected');
                    this.emit('connected', { userId: this.userId });
                    
                    // Flush message queue
                    this.flushMessageQueue();
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.handleMessage(data);
                    } catch (error) {
                        console.error('Error parsing message:', error);
                    }
                };

                this.ws.onerror = (error) => {
                    console.error('❌ WebSocket error:', error);
                    this.emit('error', error);
                    reject(error);
                };

                this.ws.onclose = () => {
                    this.connected = false;
                    console.log('⚠️  WebSocket closed');
                    this.emit('disconnected');
                    this.attemptReconnect(url);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Get WebSocket URL based on current location
     */
    getWebSocketUrl() {
        // If developer provided a websocket URL via Vite env, use that.
        const envUrl = (typeof import !== 'undefined' && import.meta && import.meta.env && import.meta.env.VITE_WEBSOCKET_URL)
            ? import.meta.env.VITE_WEBSOCKET_URL
            : null;
        if (envUrl) {
            // strip query string if present
            return envUrl.replace(/\?.*$/, '');
        }

        console.log(envUrl);

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        return `${protocol}//${host}/ws`;
    }

    /**
     * Send a message to the server
     */
    send(type, payload = {}) {
        const message = { type, payload };

        if (this.connected && this.ws) {
            this.ws.send(JSON.stringify(message));
        } else {
            // Queue message for later
            this.messageQueue.push(message);
            console.warn('Message queued (not connected):', message);
        }
    }

    /**
     * Send location to server
     */
    sendLocation(latitude, longitude, city, country) {
        this.send('location', {
            latitude,
            longitude,
            city,
            country
        });
    }

    /**
     * Request match
     */
    findMatch(preferences = {}) {
        this.send('find_match', { preferences });
    }

    /**
     * Accept a match
     */
    acceptMatch(matchId) {
        this.send('accept_match', { matchId });
    }

    /**
     * Reject a match
     */
    rejectMatch() {
        this.send('reject_match');
    }

    /**
     * Send chat message
     */
    sendChat(text) {
        this.send('chat', { text });
    }

    /**
     * Leave chat
     */
    leaveChat() {
        this.send('leave_chat');
    }

    /**
     * Handle incoming messages
     */
    handleMessage(data) {
        const { type, ...rest } = data;
        this.emit(type, rest);
        
        // Also emit generic message event
        this.emit('message', data);
    }

    /**
     * Register event listener
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Emit event to listeners
     */
    emit(event, data = null) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Flush queued messages
     */
    flushMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.ws.send(JSON.stringify(message));
        }
    }

    /**
     * Attempt to reconnect
     */
    attemptReconnect(url = null) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * this.reconnectAttempts;
            console.log(`Reconnecting in ${delay}ms... (Attempt ${this.reconnectAttempts})`);
            
            setTimeout(() => {
                this.connect(url).catch(error => {
                    console.error('Reconnection failed:', error);
                });
            }, delay);
        } else {
            console.error('Max reconnection attempts reached');
            this.emit('maxReconnectAttemptsReached');
        }
    }

    /**
     * Disconnect from server
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.connected = false;
        }
    }

    /**
     * Check if connected
     */
    isConnected() {
        return this.connected;
    }

    /**
     * Get current user ID
     */
    getUserId() {
        return this.userId;
    }
}

// Export for use in React components
export default FairTalkWebSocket;

// Example usage in React:
/*
import { useEffect, useRef } from 'react';
import FairTalkWebSocket from './utils/websocketClient';

function MyComponent() {
    const wsRef = useRef(null);

    useEffect(() => {
        const ws = new FairTalkWebSocket();
        wsRef.current = ws;

        ws.on('match_found', (data) => {
            console.log('Match found!', data);
        });

        ws.on('chat', (data) => {
            console.log('New message:', data);
        });

        ws.connect().catch(error => {
            console.error('Failed to connect:', error);
        });

        return () => ws.disconnect();
    }, []);

    const handleSendMessage = (text) => {
        wsRef.current.sendChat(text);
    };

    return (
        // JSX here
    );
}
*/
