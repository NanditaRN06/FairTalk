#!/usr/bin/env node

/**
 * WebSocket Test Client for FairTalk
 * This script helps test WebSocket connections and functionality
 * 
 * Usage: node testClient.js
 */

const WebSocket = require('ws');
const readline = require('readline');
const { v4: uuidv4 } = require('uuid');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

class FairTalkTestClient {
    constructor() {
        this.userId = 'test-user-' + Math.random().toString(36).substr(2, 9);
        this.matchId = null;
        this.partnerId = null;
        this.ws = null;
        this.connected = false;
    }

    async connect(wsUrl = 'ws://localhost:5000/ws') {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(`${wsUrl}?userId=${this.userId}`);

                this.ws.on('open', () => {
                    this.connected = true;
                    console.log('\n✅ Connected to server!');
                    console.log(`User ID: ${this.userId}`);
                    resolve();
                });

                this.ws.on('message', (data) => {
                    this.handleMessage(data);
                });

                this.ws.on('error', (error) => {
                    console.error('\n❌ WebSocket error:', error.message);
                    reject(error);
                });

                this.ws.on('close', () => {
                    this.connected = false;
                    console.log('\n⚠️  Disconnected from server');
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            console.log('\n📨 Received:', JSON.stringify(message, null, 2));
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    }

    sendMessage(message) {
        if (this.connected && this.ws) {
            this.ws.send(JSON.stringify(message));
            console.log('📤 Sent:', JSON.stringify(message, null, 2));
        } else {
            console.error('❌ Not connected to server');
        }
    }

    updateLocation(latitude, longitude, city = 'Test City', country = 'Test Country') {
        this.sendMessage({
            type: 'location',
            payload: {
                latitude,
                longitude,
                city,
                country
            }
        });
    }

    findMatch() {
        this.sendMessage({
            type: 'find_match',
            payload: {
                preferences: {}
            }
        });
    }

    acceptMatch(matchId) {
        this.sendMessage({
            type: 'accept_match',
            payload: { matchId }
        });
    }

    sendChat(text) {
        this.sendMessage({
            type: 'chat',
            payload: { text }
        });
    }

    rejectMatch() {
        this.sendMessage({
            type: 'reject_match'
        });
    }

    leaveChat() {
        this.sendMessage({
            type: 'leave_chat'
        });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

async function main() {
    console.log('\n🧪 FairTalk WebSocket Test Client');
    console.log('================================\n');

    const client = new FairTalkTestClient();

    try {
        await client.connect();
    } catch (error) {
        console.error('Failed to connect:', error.message);
        process.exit(1);
    }

    function showMenu() {
        console.log('\n📋 Commands:');
        console.log('  1. Update location');
        console.log('  2. Find match');
        console.log('  3. Accept match');
        console.log('  4. Reject match');
        console.log('  5. Send chat message');
        console.log('  6. Leave chat');
        console.log('  7. Send custom message');
        console.log('  8. Exit\n');
    }

    function promptCommand() {
        showMenu();
        rl.question('Enter command (1-8): ', (input) => {
            handleCommand(input.trim());
        });
    }

    function handleCommand(input) {
        switch (input) {
            case '1':
                rl.question('Enter latitude (default 40.7128): ', (lat) => {
                    rl.question('Enter longitude (default -74.0060): ', (lon) => {
                        rl.question('Enter city (default Test City): ', (city) => {
                            rl.question('Enter country (default Test Country): ', (country) => {
                                client.updateLocation(
                                    parseFloat(lat) || 40.7128,
                                    parseFloat(lon) || -74.0060,
                                    city || 'Test City',
                                    country || 'Test Country'
                                );
                                promptCommand();
                            });
                        });
                    });
                });
                break;

            case '2':
                client.findMatch();
                promptCommand();
                break;

            case '3':
                rl.question('Enter match ID: ', (matchId) => {
                    client.acceptMatch(matchId);
                    promptCommand();
                });
                break;

            case '4':
                client.rejectMatch();
                promptCommand();
                break;

            case '5':
                rl.question('Enter message: ', (message) => {
                    client.sendChat(message);
                    promptCommand();
                });
                break;

            case '6':
                client.leaveChat();
                promptCommand();
                break;

            case '7':
                rl.question('Enter JSON message: ', (json) => {
                    try {
                        const message = JSON.parse(json);
                        client.sendMessage(message);
                    } catch (error) {
                        console.error('Invalid JSON:', error.message);
                    }
                    promptCommand();
                });
                break;

            case '8':
                client.disconnect();
                rl.close();
                console.log('\n👋 Goodbye!');
                process.exit(0);
                break;

            default:
                console.log('❌ Invalid command');
                promptCommand();
        }
    }

    promptCommand();
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
