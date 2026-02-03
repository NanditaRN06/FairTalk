# 🧪 FairTalk Messaging Test Guide

## 📊 Current Setup

Your app has:
- ✅ **MongoDB** - Stores user data (deviceId, gender, etc.)
- ✅ **WebSocket** - Real-time messaging
- ✅ **Device ID** - Stored in localStorage & MongoDB

---

## 🎯 Step-by-Step Testing

### Step 1: Verify Users in MongoDB

**Option A: Using MongoDB Compass (GUI)**
```
1. Open MongoDB Compass
2. Connect to: mongodb://localhost:27017
3. Find database: "fairtalk" (or your DB name)
4. Click "Users" collection
5. See all users with their deviceIds
```

**Option B: Using Command Line**
```bash
mongosh
> use fairtalk
> db.users.find()
# You should see your 2 users with different deviceIds
```

### Step 2: Get the Device IDs

From MongoDB, you'll see documents like:
```json
{
  "_id": "...",
  "deviceId": "device-abc123xyz",
  "gender": "male",
  "lastVerified": "2026-02-02...",
  "dailyMatches": 0,
  "blocked": false
}
```

**Copy the two deviceIds** - you'll need them for testing.

---

## 💬 How Messaging Works Currently

### Current Flow:
```
Browser 1                    Server                  Browser 2
   │                            │                        │
   ├─ Open app ───────────────>│                         │
   │ (Get deviceId from        │                         │
   │  localStorage)            │                         │
   │                           │                         │
   ├─ Create profile ─────────>│                         │
   │ (Save to MongoDB)         │                         │
   │                           │                         │
   └─ Enter ChatPage ──────────┤─ (passes deviceId)      │
                               │                         │
                               │<─ Open app ─────────────┤
                               │                         │
                               │<─ Create profile ───────┤
                               │ (Save to MongoDB)       │
                               │                         │
                               │ (passes deviceId) ─────>│
                               │                         │
   Both in ChatPage            │   (need to connect)     │
```

---

## 🔌 Test Messaging in 2 Ways

### **Method 1: Test via Browser (Recommended)**

```
1. Terminal 1: Start Backend
   cd FairTalk/backend
   npm run dev

2. Terminal 2: Start Frontend
   cd FairTalk/frontend
   npm run dev

3. Browser Window 1 (Chrome)
   - Open http://localhost:5173
   - Enter name: "User1"
   - Click "Confirm"
   - Wait... (should see chat screen or matching screen)

4. Browser Window 2 (Firefox or Incognito)
   - Open http://localhost:5173
   - Enter name: "User2"
   - Click "Confirm"
   - Should see matching interface

5. Both click "Find a Match"
   - System tries to match you
   - Check server console for errors
```

### **Method 2: Test via API (Manual Testing)**

```bash
# Get all users from MongoDB
curl http://localhost:5000/api/user

# Check if user is eligible to chat
curl http://localhost:5000/api/user/eligibility/device-abc123xyz
```

---

## 🧪 Complete Test Scenario

### Scenario: Two Users Chatting

**User 1 (Browser 1):**
1. Open http://localhost:5173
2. Grants location permission (auto-detects)
3. Enters name: "Alice"
4. Click "Confirm & Join Chat"
5. See location: "New York, USA"
6. See "Find a Match" button
7. **Click "Find a Match"**
8. Status: "Looking for a match..."

**User 2 (Browser 2):**
1. Open http://localhost:5173
2. Grants location permission (auto-detects)
3. Enters name: "Bob"
4. Click "Confirm & Join Chat"
5. See location: "New York, USA"
6. See "Find a Match" button
7. **Click "Find a Match"**
8. Status: "Looking for a match..."

**Expected Result:**
```
Both should see:
✅ "Match Found! 🎉"
✅ Partner's location displayed
✅ "Accept & Chat" button

When both accept:
✅ Chat interface appears
✅ Both can type messages
✅ Messages appear in real-time
```

---

## 🔍 Debugging/Checking Messages

### Browser Console (F12)
```javascript
// Open DevTools (F12)
// Go to Console tab
// You should see:

✅ WebSocket connected
✅ Location updated
✅ Match found (with matchId)
✅ Chat message sent
✅ Chat message received

// If errors appear, note them down
```

### Server Console
```
Should show:
✓ Device user-abc123 connected
✓ Location updated for user-abc123
✓ Match found between user-abc123 and user-xyz789
✓ Chat message: "Hello!"
```

### Redis Queue (Optional)
```bash
redis-cli
> hgetall match:queue
# Should show users waiting for matches

> keys match:session:*
# Should show active chat sessions
```

---

## 📝 What to Check

### ✅ Location Detection
```javascript
// Browser Console
// Should show:
{
  latitude: 40.7128,
  longitude: -74.0060,
  city: "New York",
  country: "United States"
}
```

### ✅ Device ID Persistence
```javascript
// Browser Console
console.log(localStorage.getItem('deviceId'));
// Should return: device-abc123xyz (same each time)
```

### ✅ User in MongoDB
```bash
mongosh
> use fairtalk
> db.users.findOne({deviceId: "device-abc123xyz"})
# Should show your user data
```

### ✅ WebSocket Connection
```javascript
// Browser Console → Network tab
// Filter by: WS
// Should see WebSocket frame
// ws://localhost:5000/ws?userId=user-abc123
```

---

## 🚨 Common Issues & Fixes

### Issue: "Match not found / waiting forever"
```
✓ Check Redis is running: redis-cli ping
✓ Both users must click "Find a Match"
✓ Both users should be in the same vicinity
✓ Check server console for errors
✓ Verify location was sent: Browser Console → Network
```

### Issue: "Messages not sending"
```
✓ Verify match was accepted by both users
✓ Check WebSocket is connected (green dot)
✓ Check browser console for errors (F12)
✓ Verify matchId was received
✓ Check server is running
```

### Issue: "Device ID not showing"
```
✓ Clear browser cache: Ctrl+Shift+Delete
✓ Clear localStorage: DevTools → Application → Storage
✓ Refresh page
✓ Should generate new deviceId
```

### Issue: "MongoDB connection error"
```
✓ Check MongoDB running: mongosh
✓ Check connection string in .env
✓ Verify database name is correct
✓ Check network connectivity
```

---

## 📊 MongoDB Data Structure

### Users Collection
```json
{
  "_id": ObjectId("..."),
  "deviceId": "device-abc123xyz",
  "gender": "male",
  "lastVerified": ISODate("2026-02-02T10:30:00Z"),
  "dailyMatches": 0,
  "blocked": false
}
```

### Query Examples
```bash
# Find all users
db.users.find()

# Find specific user
db.users.findOne({deviceId: "device-abc123xyz"})

# Find active users
db.users.find({blocked: false})

# Count total users
db.users.countDocuments()

# Delete a user
db.users.deleteOne({deviceId: "device-abc123xyz"})
```

---

## 🔄 Message Flow Diagram

```
User 1 Types: "Hello!"
    ↓
WebSocket sends: {type: "chat", text: "Hello!"}
    ↓
Server receives on websocketService.js
    ↓
Server looks up matchId → finds User 2
    ↓
Server broadcasts to User 2's WebSocket
    ↓
User 2 receives: {type: "chat", from: "user-abc", message: "Hello!"}
    ↓
ChatPageWithLocation.jsx updates UI
    ↓
"User 1: Hello!" appears in User 2's chat
```

---

## 🎯 Complete Testing Checklist

### Pre-Test
- [ ] Backend running (`npm run dev`)
- [ ] Frontend running (`npm run dev`)
- [ ] Redis running (`redis-server`)
- [ ] MongoDB running (`mongosh` works)
- [ ] No errors in terminal

### During Test
- [ ] Browser 1: Open http://localhost:5173
- [ ] Browser 1: Enter location permission
- [ ] Browser 1: Enter name & confirm
- [ ] Browser 2: Open http://localhost:5173 (different browser/incognito)
- [ ] Browser 2: Enter location permission
- [ ] Browser 2: Enter name & confirm
- [ ] Browser 1: Click "Find a Match"
- [ ] Browser 2: Click "Find a Match"
- [ ] Both see "Match Found" notification
- [ ] Both accept match
- [ ] Chat interface appears for both
- [ ] User 1 types message
- [ ] User 2 receives message instantly
- [ ] User 2 types reply
- [ ] User 1 receives reply instantly

### Post-Test
- [ ] Check MongoDB for user data
- [ ] Check server logs for any errors
- [ ] Check browser console for any errors
- [ ] Test disconnect/reconnect
- [ ] Test finding new match

---

## 📱 Expected Screen Flow

### Screen 1: Name Entry
```
┌─────────────────────────────┐
│ FairTalk                    │
│                             │
│ Enter your name:            │
│ [____________]              │
│                             │
│ [Confirm & Join Chat]       │
└─────────────────────────────┘
```

### Screen 2: Match Finding
```
┌─────────────────────────────┐
│ FairTalk                    │
│ ✓ Connected | NYC, USA      │
│                             │
│ Looking for a match...      │
│                             │
│ [Find a Match]              │
└─────────────────────────────┘
```

### Screen 3: Match Found
```
┌─────────────────────────────┐
│ MATCH FOUND! 🎉              │
│                             │
│ Located in NYC, USA         │
│                             │
│ [ACCEPT & CHAT] [REJECT]    │
└─────────────────────────────┘
```

### Screen 4: Chat
```
┌─────────────────────────────┐
│ FairTalk                    │
│ ✓ Connected | NYC, USA      │
│                             │
│ ┌─────────────────────────┐ │
│ │ Partner: Hi there!      │ │
│ │                         │ │
│ │ You: Hello! How are you?│ │
│ └─────────────────────────┘ │
│                             │
│ [Type message...] [SEND]    │
│                             │
│ [LEAVE CHAT]                │
└─────────────────────────────┘
```

---

## 🎓 Next Steps After Testing

### 1. If messaging works ✅
- Congratulations! Your chat system is working
- Test with different locations (use VPN or browser DevTools)
- Test with 3+ users simultaneously
- Test disconnection/reconnection

### 2. If messaging has issues ❌
- Check server logs for specific errors
- Check browser console (F12) for client errors
- Verify Redis is running: `redis-cli ping`
- Verify MongoDB has user data: `db.users.find()`
- Check WebSocket connection in DevTools Network tab

### 3. To improve further 🚀
- Add message encryption
- Add user authentication
- Add message history storage
- Add typing indicators
- Add read receipts
- Add user blocking/reporting

---

## 💡 Pro Tips

### Tip 1: Use Incognito/Private Mode
```
Window 1: Chrome (normal)
Window 2: Chrome (incognito) 
= Different users, same machine
```

### Tip 2: Monitor in Real-Time
```
Terminal 1: Backend logs
Terminal 2: Redis monitor (redis-cli monitor)
Terminal 3: Browser DevTools console
= See everything happening
```

### Tip 3: Test Different Scenarios
```
Same location → should match
Different locations → test distance calc
Mobile + Desktop → test cross-device
Offline + Online → test reconnection
```

### Tip 4: Use Browser DevTools Network
```
F12 → Network → Filter: WS
Watch WebSocket frames in real-time
See all messages being sent/received
```

---

## 🎉 Success Criteria

You know it's working when:
- ✅ Two browsers open same URL
- ✅ Both grant location permission
- ✅ Both enter names and confirm
- ✅ Both click "Find a Match"
- ✅ Both see "Match Found" popup
- ✅ Both accept match
- ✅ Chat interface appears
- ✅ Type message in one browser
- ✅ Message appears instantly in other browser
- ✅ Reply appears in first browser

**If all ✅ = Your chat system is LIVE! 🎉**

---

## 📞 Quick Reference

```bash
# Start Everything
# Terminal 1
redis-server

# Terminal 2
cd FairTalk/backend && npm run dev

# Terminal 3
cd FairTalk/frontend && npm run dev

# Terminal 4 (Optional - Monitor)
redis-cli monitor

# Check MongoDB
mongosh
> use fairtalk
> db.users.find()
```

---

**Now open 2 browsers and test! Let me know if you see any errors! 🚀**
