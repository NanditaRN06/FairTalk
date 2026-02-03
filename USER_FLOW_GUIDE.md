# FairTalk - User Flow & Implementation Guide

## 📱 User Journey

### Phase 1: Connection
```
┌─────────────────────────────────────────┐
│ User opens browser at localhost:5173    │
└──────────────────┬──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │ Auto-detect location │
        │ (Geolocation API)    │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │ Request city/country │
        │ (Nominatim service)  │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │ Connect WebSocket    │
        │ ws://localhost:5000  │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │ Send location to     │
        │ server (WebSocket)   │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │ CONNECTED ✓          │
        │ Ready for matching   │
        └──────────────────────┘
```

### Phase 2: Matching
```
┌──────────────────────────────────┐
│ User clicks "Find a Match"       │
└─────────────┬────────────────────┘
              ↓
    ┌─────────────────────┐
    │ Browser sends:      │
    │ {                   │
    │   type: "find_match"│
    │ }                   │
    └─────────────────────┘
              ↓
    ┌─────────────────────────────────┐
    │ Server adds to Redis queue      │
    │ match:queue (HASH)              │
    └─────────────────────────────────┘
              ↓
    ┌─────────────────────────────────┐
    │ Server searches queue for match │
    │ (Calculates distance)           │
    └─────────────────────────────────┘
              ↓
    ┌─────────────────────────────────┐
    │ If match found:                 │
    │ - Create session in Redis       │
    │ - Generate unique matchId       │
    │ - Notify both users             │
    └─────────────────────────────────┘
              ↓
    ┌──────────────────────────────────────┐
    │ User sees:                           │
    │ ┌────────────────────────────────┐  │
    │ │ MATCH FOUND! 🎉               │  │
    │ │                                │  │
    │ │ Located in New York, USA       │  │
    │ │                                │  │
    │ │ [ACCEPT & CHAT]  [REJECT]     │  │
    │ └────────────────────────────────┘  │
    └──────────────────────────────────────┘
```

### Phase 3: Chat
```
┌──────────────────────────────────┐
│ User clicks "ACCEPT & CHAT"      │
└─────────────┬────────────────────┘
              ↓
    ┌─────────────────────┐
    │ Browser sends:      │
    │ {                   │
    │   type:             │
    │   "accept_match",   │
    │   matchId: "..."    │
    │ }                   │
    └─────────────────────┘
              ↓
    ┌──────────────────────────────────────────┐
    │ Server broadcasts to both users:         │
    │ {type: "match_started"}                  │
    └──────────────────────────────────────────┘
              ↓
    ┌──────────────────────────────────────────┐
    │ Both see chat interface:                 │
    │ ┌────────────────────────────────────┐  │
    │ │ FairTalk                           │  │
    │ │ ✓ Connected | NYC, USA             │  │
    │ │                                    │  │
    │ │ ┌────────────────────────────────┐│  │
    │ │ │ [Partner]: Hi there!           ││  │
    │ │ │                                ││  │
    │ │ │ You: Hello! How are you?       ││  │
    │ │ └────────────────────────────────┘│  │
    │ │                                    │  │
    │ │ [Type message...] [SEND]           │  │
    │ │                                    │  │
    │ │ [LEAVE CHAT]                       │  │
    │ └────────────────────────────────────┘  │
    └──────────────────────────────────────────┘
              ↓
    ┌──────────────────────────────────────────┐
    │ Messages sent via:                       │
    │ {                                        │
    │   type: "chat",                          │
    │   payload: { text: "Hello! ..." }        │
    │ }                                        │
    └──────────────────────────────────────────┘
              ↓
    ┌──────────────────────────────────────────┐
    │ Received in real-time as:                │
    │ {                                        │
    │   type: "chat",                          │
    │   from: "user-xyz",                      │
    │   message: "Hello! ...",                 │
    │   timestamp: 1234567890                  │
    │ }                                        │
    └──────────────────────────────────────────┘
```

### Phase 4: Disconnect
```
┌──────────────────────────────────┐
│ User clicks "LEAVE CHAT"         │
└─────────────┬────────────────────┘
              ↓
    ┌─────────────────────┐
    │ Browser sends:      │
    │ {                   │
    │   type: "leave_chat"│
    │ }                   │
    └─────────────────────┘
              ↓
    ┌──────────────────────────────────┐
    │ Server notifies partner:         │
    │ {type: "partner_left"}           │
    └──────────────────────────────────┘
              ↓
    ┌──────────────────────────────────┐
    │ Both users back to main screen   │
    │ Ready to find new match          │
    └──────────────────────────────────┘
```

---

## 🛠️ Implementation Steps

### Step 1: Install Dependencies
```bash
# Backend
cd FairTalk/backend
npm install redis uuid

# Frontend  
cd ../frontend
npm install lucide-react  # For icons (optional)
```

### Step 2: Configure Redis
```env
# FairTalk/backend/.env
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=your_password  # if auth required
```

### Step 3: Start Redis
```bash
# Option 1: Local installation
redis-server

# Option 2: Docker
docker run -d -p 6379:6379 redis:latest

# Verify connection
redis-cli ping
# Should output: PONG
```

### Step 4: Start Backend
```bash
cd FairTalk/backend
npm run dev
# Server running on port 5000
# WebSocket available at ws://localhost:5000/ws
```

### Step 5: Start Frontend
```bash
cd FairTalk/frontend
npm run dev
# Frontend on http://localhost:5173
```

### Step 6: Test with Browser
```
1. Open http://localhost:5173 in Chrome
2. Grant location permission
3. See "Find a Match" button
4. Open same URL in Firefox
5. Both request match
6. See match acceptance screen
7. Both accept
8. Chat interface appears
9. Send messages - real-time sync!
```

---

## 🧪 Test Scenarios

### Test 1: Basic Connection
1. Open frontend
2. Check console for: "✅ WebSocket connected"
3. Verify connection indicator is green
4. Should see location displayed

### Test 2: Match Finding
1. Open two browser windows/tabs
2. Both click "Find a Match"
3. Server calculates distance
4. Both should receive match notification
5. Both see partner's location

### Test 3: Accept & Chat
1. One user accepts match
2. Other user accepts match
3. Chat interface appears for both
4. Type message in one browser
5. See instant message in other browser
6. Messages show sender

### Test 4: Disconnect Handling
1. During chat, close one browser tab
2. Other user should see: "Partner disconnected"
3. Connection indicator turns red
4. Can find new match

### Test 5: Offline Reconnect
1. Stop backend server
2. Frontend shows: "Disconnected"
3. Auto-reconnect attempts every 3 seconds
4. When backend restarts, auto-reconnects
5. Location re-sent, ready for matching

---

## 🐛 Common Issues & Solutions

### Issue: "WebSocket connection refused"
```
Error: Connection to ws://localhost:5000/ws failed

Solution:
1. Verify backend is running: npm run dev
2. Check port 5000 not in use: netstat -an | grep 5000
3. Verify no firewall blocking port 5000
4. Check WebSocket URL in ChatPageWithLocation.jsx
```

### Issue: "No match found"
```
Error: Waiting for match... (forever)

Solution:
1. Verify Redis is running: redis-cli ping
2. Open 2+ browser windows/tabs
3. Both must click "Find a Match"
4. Check distance isn't 0 (same location)
5. Verify locations are within 100km (default)
```

### Issue: "Messages not sending"
```
Error: Buttons greyed out

Solution:
1. Verify both users accepted match
2. Check WebSocket is connected (green dot)
3. Check browser console for errors
4. Verify matchId was received
5. Check server console for errors
```

### Issue: "Location not detected"
```
Error: Location stays as "Unknown"

Solution:
1. Check browser geolocation permission
2. Allow location access when prompted
3. Using HTTP localhost should auto-allow
4. If on HTTPS, browser blocks geolocation
5. Check browser console for permission errors
```

### Issue: Redis connection error
```
Error: Error: connect ECONNREFUSED 127.0.0.1:6379

Solution:
1. Start Redis: redis-server
2. Or: docker run -d -p 6379:6379 redis:latest
3. Verify with: redis-cli ping
4. Check REDIS_HOST and REDIS_PORT in .env
```

---

## 📊 Monitoring

### Check Server Health
```bash
curl http://localhost:5000/health
# Returns JSON with connection count
```

### Monitor Redis Queue
```bash
redis-cli
> hgetall match:queue
> hgetall match:session:*
> dbsize
```

### View WebSocket Connections
```bash
# In browser DevTools:
# Network tab → Filter by WS
# See all WebSocket frames in/out
```

### Server Logs
```
Watch terminal where npm run dev is running
- New connections: "User X connected"
- Messages: "DEBUG: Message received"
- Errors: Full error stack traces
```

---

## 🚀 Production Deployment

### Using Render/Heroku

**Backend**
```bash
# Create Procfile
web: npm start

# Set environment variables in dashboard
PORT=5000
MONGO_URI=mongodb+srv://...
REDIS_URL=redis://:password@host:port

# Deploy
git push heroku main
```

**Frontend**
```bash
# Add to vite.config.js
export default {
  server: {
    proxy: {
      '/ws': {
        target: 'wss://backend-url.com',
        ws: true
      }
    }
  }
}

# Deploy to Vercel/Netlify
npm run build
# Upload dist folder
```

### Environment Variables (Production)
```env
# Backend
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
REDIS_URL=redis://:password@host:port
LOG_LEVEL=info

# Frontend
VITE_WS_URL=wss://backend-domain.com/ws
```

---

## 📈 Performance Tips

1. **Enable Compression**
   ```javascript
   const compression = require('compression');
   app.use(compression());
   ```

2. **Connection Pooling**
   ```javascript
   const pool = redis.createPool({
     max: 100,
     min: 10
   });
   ```

3. **Message Compression**
   ```javascript
   ws.send(JSON.stringify(data), { compress: true });
   ```

4. **Batch Matching**
   - Match every 5 seconds (configurable)
   - Reduces Redis queries
   - Better throughput

---

## ✅ Pre-Launch Checklist

- [ ] Redis running and tested
- [ ] MongoDB connected
- [ ] Backend starts without errors
- [ ] Frontend loads on localhost:5173
- [ ] Geolocation works in browser
- [ ] Two browsers can connect simultaneously
- [ ] Match finding works (distance calculated)
- [ ] Chat messages transmit in real-time
- [ ] Disconnect handling works
- [ ] Reconnection logic works
- [ ] Console has no errors
- [ ] All environment variables set
- [ ] Rate limiting configured
- [ ] Error handling tested

---

## 📞 Quick Reference

| Component | Port | URL |
|-----------|------|-----|
| Backend/WS | 5000 | ws://localhost:5000/ws |
| Frontend | 5173 | http://localhost:5173 |
| Redis | 6379 | redis://localhost:6379 |
| MongoDB | 27017 | mongodb://localhost:27017 |

| Feature | File | Function |
|---------|------|----------|
| Matching | redisService.js | findBestMatch() |
| WebSocket | websocketService.js | handleMessage() |
| UI | ChatPageWithLocation.jsx | Full component |
| Utility | websocketClient.js | FairTalkWebSocket |
