# Phoenix AI - Smart Agriculture Platform

A full-stack AI-powered Smart Agriculture & Mandi Market platform built with **React (Vite)**, **Node.js (Express)**, and **MongoDB (Mongoose)**.

---

## 🌟 Features Overview

- 🔐 **JWT Authentication & Password Recovery**: Secure registration (+91 Indian phone validation), login, session persistence, mandatory residential address completion, and SMTP Nodemailer password reset flow.
- 🌾 **AI Crop Advisory System**: Rule-based expert system providing customized NPK fertilizer dosage, irrigation guidance, disease risk probability scoring, and yield predictions based on real soil pH, state/district conditions, and dynamic growth stages.
- 📈 **Live Mandi Prices API**: Real-time government mandi market price tracking with state/district/commodity search, price trends (Min, Max, Modal), and pre-seeded fallback datasets.
- 🌤️ **Weather Forecast & Soil Conditions**: OpenWeatherMap API integration with 15 pre-seeded Indian agricultural cities, hourly forecasts, rain probability, and soil moisture indicators.
- 📰 **Multilingual Farmer News**: NewsAPI integration supporting English, Hindi, and Tamil language filters with fallback dataset support.
- 💻 **OS Laptop UI Settings Panel**: Laptop window-frame style system settings UI with live avatar uploader, profile updates, password changes, dark mode toggle, and notification toggles.

---

## 🏗️ Architecture

```
CIT Hackathon/
├── client/                     # React + Vite Frontend
│   ├── public/                 # Static assets & avatar SVG
│   ├── src/
│   │   ├── components/         # Navbar, Sidebar, Toast, Skeletons, ProtectedRoute
│   │   ├── context/            # AuthContext state management
│   │   ├── pages/              # Login, Register, Advisory, Crops, News, Settings, etc.
│   │   ├── services/           # Centralized Axios API instance
│   │   ├── App.jsx             # React Router application entry
│   │   ├── main.jsx            # React root mount
│   │   └── index.css           # Tailwind design tokens & custom animations
│   ├── vite.config.js          # Vite build config & proxy to backend API
│   ├── tailwind.config.js      # Tailwind green color palette & font configuration
│   └── package.json
│
├── server/                     # Node.js + Express Backend
│   ├── config/                 # Mongoose connection & Nodemailer configuration
│   ├── controllers/            # Auth, Crop, Advisory, Weather, News, Mandi, Dashboard controllers
│   ├── middleware/             # Auth JWT verification & Error handlers
│   ├── models/                 # User, Crop, Weather, AdvisoryResult, News schemas
│   ├── routes/                 # Express API routes
│   ├── services/               # Rule-based advisory expert system logic
│   ├── uploads/                # User avatar uploads directory
│   ├── server.js               # Express application entry & auto-seeding
│   └── package.json
│
├── README.md
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.x or higher
- **MongoDB**: Local MongoDB instance running on `mongodb://localhost:27017/phoenix-agri` or a MongoDB Atlas connection URI.

---

### 1. Server Setup

Navigate to the `server/` directory:

```bash
cd server
npm install
```

Create a `.env` file inside `server/`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/phoenix-agri
JWT_SECRET=phoenix_ai_agriculture_super_secret_jwt_key_2026
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
OPENWEATHER_API_KEY=your_openweather_api_key
DATA_GOV_API_KEY=your_data_gov_api_key
NEWS_API_KEY=your_news_api_key
```

Start the Express backend:

```bash
npm start
# or for development with hot reload:
npm run dev
```

The server will automatically seed the database with **15 major Indian agricultural cities weather data** and default mandi crop records if MongoDB is empty.

---

### 2. Client Setup

In a new terminal window, navigate to the `client/` directory:

```bash
cd client
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Open your browser at `http://localhost:3000`. Vite automatically proxies API calls (`/api` and `/uploads`) to `http://localhost:5000`.

---

## 📡 API Endpoints Reference

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Authenticate user & receive JWT token
- `GET /api/auth/profile` - Fetch current user profile
- `PUT /api/auth/profile` - Update user details or complete address
- `POST /api/auth/forgot-password` - Send password reset email link
- `GET /api/auth/verify-reset-token/:token` - Verify validity of reset token
- `POST /api/auth/reset-password` - Set new password with valid token
- `POST /api/auth/upload-avatar` - Upload user profile picture

### AI Advisory (`/api/advisory`)
- `POST /api/advisory/calculate` - Run rule-based advisory calculation for NPK, irrigation, diseases, and yield forecast
- `GET /api/advisory/history` - Retrieve user's saved advisory history

### Mandi Prices (`/api/mandi` & `/api/crops`)
- `GET /api/mandi/prices` - Fetch Mandi market prices with state/district/commodity filter
- `GET /api/mandi/states` - Get distinct states list
- `GET /api/mandi/districts?state=...` - Get districts for a state
- `GET /api/mandi/commodities` - Get distinct commodities list

### Weather (`/api/weather`)
- `GET /api/weather/current?city=...` - Get weather forecast & soil condition for a city
- `POST /api/weather/force-seed` - Trigger seeding of 15 Indian cities

### News (`/api/news`)
- `GET /api/news?language=en` - Get agricultural news (en, hi, ta)

### Dashboard (`/api/dashboard`)
- `GET /api/dashboard/overview` - Aggregated user, weather, live market prices, and news data
