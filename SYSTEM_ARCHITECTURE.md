# FairTalk Multi-Browser Communication System

## 🎯 Overview

This system allows real-time chat communication between users across different browsers with automatic location-based matching and Redis queue management.

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  Browser 1                          │        Browser 2           │
│  ┌─────────────────────┐           │  ┌─────────────────────┐  │
│  │ React App          │           │  │ React App          │  │
│  │ ChatPageWithLoc    │─ WS Conn ─┼─ │ ChatPageWithLoc    │  │
│  │ websocketClient.js │           │  │ websocketClient.js │  │
│  └─────────────────────┘           │  └─────────────────────┘  │
│  User ID: user-xyz                 │  User ID: user-abc        │
│  Location: NYC                     │  Location: NYC             │
└─────────────────────────────────────────────────────────────────┘
                          ↓
                   WebSocket (WS/WSS)
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                      SERVER LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  Express.js Server (port 5000)                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ websocketService.js                                      │  │
│  │ - Connection management                                  │  │
│  │ - Message routing                                        │  │
│  │ - Session handling                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ redisService.js                                          │  │
│  │ - Match queue (HASH)                                     │  │
│  │ - Match sessions (HASH with TTL)                         │  │
│  │ - Distance calculation (Haversine)                       │  │
│  │ - User matching algorithm                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│  Redis (port 6379)              │  MongoDB                     │
│  ┌──────────────────────────┐   │  ┌──────────────────────┐   │
│  │ match:queue             │   │  │ Users Collection     │   │
│  │ match:session:{id}      │   │  │ - User profiles      │   │
│  │ (with TTL)              │   │  │ - Chat history       │   │
│  └──────────────────────────┘   │  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Communication Flow

### 1. **User Connects**
```javascript
// Browser sends
WS: ws://localhost:5000/ws?userId=user-xyz

// Server receives connection
→ stores in connections Map
→ sends acknowledgement
```

### 2. **User Updates Location**
```javascript
// Browser sends
{
  type: "location",
  payload: {
    latitude: 40.7128,
    longitude: -74.0060,
    city: "New York",
    country: "United States"
  }
}

// Server
→ updates connections[userId].location
→ ready for matching
```

### 3. **User Requests Match**
```javascript
// Browser sends
{
  type: "find_match",
  payload: {
    preferences: { /* optional */ }
  }
}

// Server action:
// 1. Add user to Redis queue: match:queue
// 2. Fetch all queued users
// 3. Calculate distances (Haversine formula)
// 4. Find best match (closest user)
// 5. Create match session in Redis
// 6. Notify both users
```

### 4. **Match Found - User Accepts**
```javascript
// Browser sends
{
  type: "accept_match",
  payload: {
    matchId: "uuid-here"
  }
}

// Server action:
// 1. Updates connection.matchId
// 2. Notifies both users that chat started
// 3. Both users ready to exchange messages
```

### 5. **Chat Message Exchange**
```javascript
// User 1 sends
{
  type: "chat",
  payload: { text: "Hello!" }
}

// Server action:
// 1. Gets match session
// 2. Routes to partner (User 2)
// 3. Sends acknowledgement to User 1

// User 2 receives
{
  type: "chat",
  from: "user-xyz",
  message: "Hello!",
  timestamp: 1234567890
}
```

### 6. **User Leaves Chat**
```javascript
// Browser sends
{
  type: "leave_chat"
}

// Server action:
// 1. Clears matchId from connection
// 2. Notifies partner
// 3. Removes from active sessions
```

## 📁 File Structure & Responsibilities

### Backend Files

#### `server.js` - Main Server Entry Point
- Initializes Express and HTTP server
- Sets up Redis connection
- Configures WebSocket server
- Connects to MongoDB
- Starts listening on port 5000

#### `services/redisService.js` - Redis Queue Management
- `initializeRedis()` - Connect to Redis
- `addToMatchQueue()` - Add user to queue
- `removeFromMatchQueue()` - Remove user from queue
- `getMatchQueue()` - Get all queued users
- `findBestMatch()` - Algorithm to find best match
- `calculateDistance()` - Haversine formula
- `createMatchSession()` - Create match in Redis
- `getMatchSession()` - Retrieve match data

#### `services/websocketService.js` - WebSocket Handler
- `setupWebSocketServer()` - Initialize WS server
- `handleMessage()` - Route messages by type
- `handleLocationUpdate()` - Process location
- `handleFindMatch()` - Initiate matching
- `handleChatMessage()` - Route chat messages
- `handleAcceptMatch()` - Start active chat
- `handleUserDisconnect()` - Cleanup on disconnect
- `getActiveConnections()` - Connection count

#### `config/matchConfig.js` - Matching Configuration
- Match distance limits
- Strategy definitions (distance, interests, random, hybrid)
- Scoring weights
- Rate limiting rules
- Auto-ban criteria

#### `testClient.js` - CLI Test Utility
- Interactive WebSocket client
- Test all message types
- Debug connection issues
- Simulate multiple users

### Frontend Files

#### `components/ChatPageWithLocation.jsx` - Main Chat Component
- Auto geolocation detection
- Match request/acceptance UI
- Real-time message display
- Partner location display
- Connection status indicator

#### `utils/websocketClient.js` - WebSocket Client Utility
- `FairTalkWebSocket` class
- Connection management
- Auto-reconnect logic
- Message queuing
- Event listener system
- Helper methods for each message type

## 🚀 Message Types & Payloads

### Location Update
```json
{
  "type": "location",
  "payload": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "city": "New York",
    "country": "United States"
  }
}
```

### Find Match
```json
{
  "type": "find_match",
  "payload": {
    "preferences": {
      "maxDistance": 50,
      "ageRange": [18, 65],
      "interests": ["sports", "music"]
    }
  }
}
```

### Match Found (Server Response)
```json
{
  "type": "match_found",
  "matchId": "550e8400-e29b-41d4-a716-446655440000",
  "partner": {
    "userId": "user-abc",
    "location": {
      "lat": 40.7128,
      "lon": -74.0060,
      "city": "New York",
      "country": "United States"
    }
  }
}
```

### Accept Match
```json
{
  "type": "accept_match",
  "payload": {
    "matchId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Chat Message
```json
{
  "type": "chat",
  "payload": { "text": "Hello! How are you?" }
}
```

### Chat Received (Server broadcasts to partner)
```json
{
  "type": "chat",
  "from": "user-xyz",
  "message": "Hello! How are you?",
  "timestamp": 1675367890123
}
```

## 🔍 Matching Algorithm

### Distance-Based (Default)
1. User in Redis queue: `{userId, location, preferences, joinedAt}`
2. System fetches all queued users
3. For each user, calculate distance using Haversine formula
4. Filter by max distance (default: 100km)
5. Return user with minimum distance

### Haversine Formula
```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
c = 2 × atan2(√a, √(1-a))
distance = R × c (R = Earth radius = 6371 km)
```

### Hybrid Strategy (Future)
Combines multiple factors:
- **Distance Score**: 50% weight
- **Interest Match**: 30% weight  
- **Language Match**: 20% weight

```
combinedScore = (distScore × 0.5) + (interestScore × 0.3) + (langScore × 0.2)
```

## 💾 Redis Data Structure

### Match Queue (Hash)
```
Key: "match:queue"
Type: HASH

Fields:
├── "user-xyz" → '{"userId":"user-xyz","location":{...},"preferences":{...}}'
├── "user-abc" → '{"userId":"user-abc","location":{...},"preferences":{...}}'
└── "user-def" → '{"userId":"user-def","location":{...},"preferences":{...}}'
```

### Match Session (Hash with TTL)
```
Key: "match:session:550e8400-e29b-41d4-a716-446655440000"
Type: HASH
TTL: 3600 seconds

Fields:
├── "user1" → "user-xyz"
└── "user2" → "user-abc"
```

## 🔌 Multi-Browser Testing

### Local Test
```bash
# Terminal 1: Backend
cd FairTalk/backend
npm run dev
# Server runs on ws://localhost:5000

# Terminal 2: Frontend  
cd FairTalk/frontend
npm run dev
# Frontend on http://localhost:5173

# Terminal 3: Optional test client
cd FairTalk/backend
node testClient.js
```

### Multiple Browsers
1. Open `http://localhost:5173` in Chrome
2. Open `http://localhost:5173` in Firefox (different user ID)
3. Both can request matches
4. System matches them and enables bidirectional chat

### Cross-Device Testing
1. Deploy backend: `npm start`
2. Deploy frontend: `npm run build && serve dist`
3. Open frontend URL on multiple devices
4. Each device has own WebSocket connection
5. Chat works across devices in same network

## 🛡️ Security Considerations

### Current Implementation
- ✅ WebSocket connection per user
- ✅ Unique user IDs
- ✅ Session-based matching
- ✅ Redis TTL on sessions

### Recommended Additions
- 🔒 User authentication/tokens
- 🔒 Rate limiting on messages
- 🔒 Message encryption
- 🔒 User blocking/reporting
- 🔒 HTTPS/WSS in production
- 🔒 CORS validation
- 🔒 Input sanitization

## 📈 Scaling Strategies

### Horizontal Scaling
```
Multiple Server Instances
    ↓
Redis Pub/Sub for Inter-Server Communication
    ↓
MongoDB Replica Set for Data
    ↓
Load Balancer (Nginx, HAProxy)
```

### Redis Scaling
- Redis Cluster for distribution
- Cache frequently accessed data
- Use pipelining for batch operations
- Implement connection pooling

### Performance Tips
- Compress WebSocket messages
- Implement connection limits
- Use binary message format for large data
- Implement heartbeat/ping-pong
- Cache geolocation requests

## 🐛 Debugging

### Enable Verbose Logging
```javascript
// In websocketService.js
console.log('DEBUG: Message received', message);
console.log('DEBUG: Active connections:', connections.size);
console.log('DEBUG: Queue size:', await getQueueSize());
```

### Monitor Redis
```bash
redis-cli monitor
redis-cli info
redis-cli keys match:*
redis-cli hgetall match:queue
```

### Browser DevTools
- Open DevTools → Network → WS
- See all WebSocket messages
- Check ping/pong frames
- Monitor connection state

## 📚 Additional Resources

- [WebSocket RFC 6455](https://tools.ietf.org/html/rfc6455)
- [Redis Streams](https://redis.io/topics/streams-intro)
- [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)
- [ws Library Docs](https://github.com/websockets/ws)

## ✅ Checklist for Production

- [ ] Environment variables configured
- [ ] Redis running and configured
- [ ] MongoDB connected
- [ ] HTTPS/WSS enabled
- [ ] Rate limiting implemented
- [ ] User authentication added
- [ ] Logging and monitoring set up
- [ ] Error handling comprehensive
- [ ] Load testing completed
- [ ] Security audit done
