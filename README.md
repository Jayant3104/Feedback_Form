# Beumer Feedback App — Angular + Node.js

## Project Structure
```
beumer-app/
├── frontend/          # Angular 19 app
│   ├── src/
│   │   └── app/
│   │       ├── app.component.ts      # Main wizard logic
│   │       ├── app.component.html    # Multi-page form template
│   │       ├── app.component.css     # All styles
│   │       ├── models/
│   │       │   └── feedback.model.ts # TypeScript interfaces
│   │       └── services/
│   │           └── feedback.service.ts # API calls
│   ├── proxy.conf.json               # Dev API proxy
│   └── angular.json
│
└── backend/           # Node.js + Express API
    ├── server.js      # Main server (OTP, JWT, MongoDB, routes)
    ├── .env.example   # Environment variable template
    └── package.json
```

## Setup & Run

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
# Fill in your SMTP and MongoDB credentials in .env
node server.js
# Server runs on http://localhost:8000
```

### 2. Frontend (Development)
```bash
cd frontend
npm install
npx ng serve
# App runs on http://localhost:4200 (proxied to backend)
```

### 3. Production
```bash
cd frontend
npx ng build --configuration production
# Built files go to dist/frontend/browser/
# Backend serves them automatically from http://localhost:8000
```

## Environment Variables (.env)
| Variable       | Description                        |
|----------------|------------------------------------|
| SMTP_HOST      | SMTP server (e.g. smtp.gmail.com)  |
| SMTP_PORT      | 587 (TLS) or 465 (SSL)             |
| SMTP_USER      | Sender email address               |
| SMTP_PASSWORD  | App password                       |
| JWT_SECRET     | Secret key for JWT tokens          |
| MONGODB_URL    | MongoDB connection string          |
| DATABASE_NAME  | Database name (beumer_feedback)    |
| PORT           | Server port (default: 8000)        |

## API Endpoints
| Method | Path                  | Auth     | Description         |
|--------|-----------------------|----------|---------------------|
| POST   | /api/send-otp         | None     | Send OTP to email   |
| POST   | /api/verify-otp       | None     | Verify OTP, get JWT |
| POST   | /api/submit-feedback  | Bearer   | Submit form data    |
| GET    | /api/health           | None     | Health check        |
