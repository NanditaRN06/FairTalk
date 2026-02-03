# FairTalk - Multi-Browser Chat with Location-Based Matching

A real-time chat application that connects users across different browsers with location-based matching and Redis queue management.

## Features

- **Multi-Browser Support**: Chat with anyone across different browsers in real-time
- **Location-Based Matching**: Users are matched based on their geographical location
- **Redis Queue**: Manages a queue of users waiting for matches
- **Real-time WebSocket Communication**: Instant message delivery
- **Auto-location Detection**: Gets user's city and country automatically
- **Session Management**: Secure match sessions with unique IDs

## Architecture

### Backend
- **Express.js**: REST API and server
- **WebSocket (ws)**: Real-time bidirectional communication
- **Redis**: Queue management and session storage
- **MongoDB**: User data persistence

### Frontend
- **React + Vite**: Modern UI framework
- **WebSocket Client**: Real-time communication
- **Geolocation API**: Auto location detection
- **Tailwind CSS**: Styling

## Project Structure

```
FairTalk/
├── backend/
│   ├── server.js                 # Main server file
│   ├── package.json
│   ├── .env.example             # Environment template
│   ├── services/
│   │   ├── redisService.js      # Redis queue & matching logic
│   │   └── websocketService.js  # WebSocket connection handling
│   ├── models/
│   ├── routes/
│   └── controllers/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatPageWithLocation.jsx  # NEW: Enhanced chat with location
│   │   │   └── ChatPage.jsx              # Original chat component
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
```

## Setup Instructions

### Prerequisites
- Node.js 14+
- Redis server running locally or remotely
- MongoDB
- Modern web browser with Geolocation support

### Installation

#### 1. Backend Setup

```bash
cd FairTalk/backend
npm install
```

#### 2. Configure Environment

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/fairtalk
REDIS_HOST=localhost
REDIS_PORT=6379
NODE_ENV=development
```

#### 3. Start Redis Server

```bash
# Using Docker
docker run -d -p 6379:6379 redis:latest

# Or if Redis is installed locally
redis-server

# Or on Windows with WSL
wsl redis-server
```

#### 4. Start Backend Server

```bash
npm run dev
# Or for production
npm start
```

Server will run on `http://localhost:5000`

#### 5. Frontend Setup

```bash
cd FairTalk/frontend
npm install
npm run dev
```

Frontend will run on `http://localhost:5173` (or shown in terminal)

## API Documentation

### WebSocket Message Protocol

#### Connect to WebSocket
```
ws://localhost:5000/ws?userId=USER_ID
```

#### Message Types

##### 1. **Location Update**
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

##### 2. **Find Match**
```json
{
  "type": "find_match",
  "payload": {
    "preferences": {
      "ageRange": [18, 65],
      "maxDistance": 50
    }
  }
}
```

Server Response:
```json
{
  "type": "match_found",
  "matchId": "uuid-here",
  "partner": {
    "userId": "partner-id",
    "location": {
      "lat": 40.7128,
      "lon": -74.0060,
      "city": "New York",
      "country": "United States"
    }
  }
}
```

##### 3. **Accept Match**
```json
{
  "type": "accept_match",
  "payload": {
    "matchId": "match-uuid"
  }
}
```

Server Response:
```json
{
  "type": "match_started",
  "matchId": "match-uuid",
  "partnerId": "partner-user-id"
}
```

##### 4. **Send Chat Message**
```json
{
  "type": "chat",
  "payload": {
    "text": "Hello, how are you?"
  }
}
```

Partner Receives:
```json
{
  "type": "chat",
  "from": "sender-user-id",
  "message": "Hello, how are you?",
  "timestamp": 1234567890
}
```

##### 5. **Reject Match**
```json
{
  "type": "reject_match"
}
```

##### 6. **Leave Chat**
```json
{
  "type": "leave_chat"
}
```

## Redis Data Structure

### Match Queue
```
Key: "match:queue"
Type: HASH
Fields: 
  - userId → {"userId": "...", "location": {...}, "preferences": {...}}
```

### Match Sessions
```
Key: "match:session:{matchId}"
Type: HASH
Fields:
  - user1 → user_id
  - user2 → user_id
TTL: 3600 seconds (1 hour)
```

## Matching Algorithm

The system uses a **location-based matching algorithm**:

1. User requests a match via WebSocket
2. User's data (ID, location, preferences) added to Redis queue
3. System calculates distance to all queued users (Haversine formula)
4. Closest match is selected
5. Both users notified of match
6. Match session created in Redis
7. Users removed from queue

### Distance Calculation (Haversine Formula)
```javascript
distance = 2 * R * atan2(√a, √(1-a))
where:
  R = Earth's radius (6371 km)
  a = sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2)
```

## React Component: ChatPageWithLocation

The new `ChatPageWithLocation.jsx` component provides:

- Auto geolocation detection
- Real-time location display
- Match acceptance UI
- Chat interface with message history
- Partner disconnect handling
- Location-based status

### Usage

```jsx
import ChatPageWithLocation from './components/ChatPageWithLocation';

export default function App() {
  return <ChatPageWithLocation />;
}
```

## Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/fairtalk

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional_password

# WebSocket
WS_PORT=5000
```

## Multi-Browser Testing

### Test Locally
Open multiple browser windows/tabs:
1. http://localhost:5173 (User 1)
2. http://localhost:5173 (User 2 - different browser or private mode)

Both will be assigned unique user IDs and can be matched.

### Test Remotely
1. Deploy frontend and backend to hosting service
2. Update WebSocket URL in frontend to production server
3. Share URL with others to test

## Troubleshooting

### WebSocket Connection Failed
- Ensure backend server is running on correct port
- Check CORS configuration in server.js
- Verify WebSocket URL matches your server URL

### No Match Found
- Ensure Redis is running
- Check browser console for geolocation errors
- Verify users are waiting in the queue

### Location Not Detected
- Check browser geolocation permissions
- Ensure HTTPS (required for some browsers)
- Use browser developer tools to manually set location

### Redis Connection Error
- Verify Redis server is running
- Check Redis host/port in `.env`
- Ensure firewall allows Redis connection

## Future Enhancements

- [ ] User profiles with interests/hobbies
- [ ] Filter matches by preferences
- [ ] Block/report features
- [ ] Message history
- [ ] Video/audio call integration
- [ ] Admin dashboard
- [ ] Rate matching and feedback
- [ ] Advanced distance filters
- [ ] Interest-based matching
- [ ] Custom queue strategies

## Security Considerations

- Validate all WebSocket messages
- Implement rate limiting on message sending
- Add user authentication/registration
- Encrypt sensitive data in Redis
- Use HTTPS/WSS in production
- Implement CORS properly
- Add input sanitization

## Performance Tips

- Redis clustering for horizontal scaling
- WebSocket session pooling
- Message compression
- Lazy load user profiles
- Implement heartbeat/ping-pong

## License

MIT License - Feel free to use this project

## Support

For issues and questions, contact the development team.
