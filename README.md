# FairTalk

FairTalk is a real-time, AI-verified chat platform designed to connect people based on personality compatibility and fairness.

> **Deploy:** [ https://fair-talk.vercel.app/](https://fair-talk.vercel.app/)

## 📚 Documentation

The full documentation for FairTalk is split into detailed guides:

### 🏗️ **[System Architecture](ARCHITECTURE.md)**
> **Read this first!** A deep dive into how FairTalk really works.
> - **Three-Tier Design:** User, Match, and Chat modules.
> - **Visual Diagrams:** Full system hierarchy and flow charts.
> - **Privacy Logic:** Explanation of "Delete-After-Verify" and "Device ID" systems.
> - **Math:** How the fairness algorithm calculates compatibility scores.

### 🔌 **[API Reference](API.md)**
> Technical documentation for developers.
> - **REST Endpoints:** Verification, Eligibility, and User Management.
> - **WebSocket Events:** Full list of JSON payloads for Queue and Chat events.
> - **Integration Details:** How to integrate with the Luxand AI service.

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- MongoDB Instance
- Redis (Upstash or local)
- Luxand Cloud Account (for Face Verification)


### Installation

1.  **Clone the repository** (if you haven't already).

2.  **Backend Setup**
    ```bash
    cd backend
    npm install
    npm run dev
    ```
    *The backend runs on port 5000 by default.*

3.  **Frontend Setup**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
    *The frontend will run via Vite (usually port 5173).*

## 🏗️ Project Structure
```
├── backend/            # Express Server & Services
│   ├── services/       # Core Logic (Matching, AI)
│   ├── routes/         # REST API Routes
│   ├── models/         # Mongoose Models
│   └── server.js       # Entry Point & WebSocket Handler
├── frontend/           # React Application
│   ├── src/
│   │   ├── components/ # UI Components
│   │   └── App.jsx     # Main Layout
│   └── vite.config.js  # Vite Configuration
└── README.md           # This file
```

## 🛠️ Key Technologies
- **Core:** React, Node.js, Express
- **Real-time:** WebSockets (`ws`), Redis (Pub/Sub)
- **Database:** MongoDB, Redis
- **AI:** Luxand Face Recognition (Using the free trial version which has a limit of number of requests)
- **Design:** Tailwind CSS

  **For the working of the website internet connection is a must.**



