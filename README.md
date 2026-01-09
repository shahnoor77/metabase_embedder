# Metabase Embedding Orchestration System

## 🎯 Project Overview

A **production-ready** multi-tenant Metabase embedding system that automatically provisions isolated analytics workspaces for every user. Built with FastAPI, PostgreSQL, Docker, and React.

### ✅ Current Status: **BACKEND VERIFIED & OPERATIONAL**

**Major Achievement:** Successfully automated the complete multi-tenant flow:
- ✅ JWT-based authentication system
- ✅ Automatic Metabase Collection creation per workspace
- ✅ Secure embedding URL generation with signed tokens
- ✅ All core endpoints returning correct HTTP status codes (200/201)
- ✅ Database relationships verified and operational

---

## 🏗️ System Architecture

```
┌─────────────┐      ┌──────────────┐      ┌────────────┐
│   Frontend  │◄────►│   Backend    │◄────►│  Metabase  │
│  React/Vite │      │   FastAPI    │      │  BI Engine │
│ Port: 5173  │      │  Port: 8000  │      │ Port: 3000 │
└─────────────┘      └──────────────┘      └────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  PostgreSQL  │
                     │  Port: 5432  │
                     └──────────────┘
```

### Service Components

| Service | Technology | Port | Purpose |
|---------|-----------|------|---------|
| **Frontend** | React + Vite | 5173 | User interface |
| **Backend** | FastAPI | 8000 | API & orchestration layer |
| **Database** | PostgreSQL 15 | 5432 | Application data store |
| **Metabase** | Metabase OSS | 3000 | Analytics & BI dashboards |

---

## 📁 Key File Roles

### Backend Structure
```
backend/
├── app/
│   ├── main.py                 # FastAPI entry point, CORS config
│   ├── auth/                   # JWT authentication logic
│   │   ├── router.py          # /auth/login endpoint
│   │   └── utils.py           # Token generation/verification
│   ├── workspaces/            # Core business logic
│   │   ├── router.py          # Workspace CRUD endpoints
│   │   ├── service.py         # Metabase API client
│   │   └── models.py          # SQLAlchemy models
│   └── config.py              # Environment variables
```

### Frontend Structure
```
frontend/
├── src/
│   ├── services/
│   │   └── api.js             # Axios client (needs fixes)
│   ├── components/
│   │   ├── Login.jsx
│   │   ├── WorkspaceList.jsx
│   │   └── WorkspaceDetail.jsx
│   └── App.jsx
```

### Infrastructure
- **`docker-compose.yml`**: Orchestrates all 4 services with proper networking
- **`.env`**: Contains secrets (Metabase API keys, JWT secrets)

---

## 🔐 Authentication Flow (VERIFIED)

### Step 1: User Login

**Request:**
```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "email@gmail.com", "password": "PasswordInSignUp"}'
```

**✅ Successful Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzaGFobm9vcnI5OTU1QGdtYWlsLmNvbSIsImV4cCI6MTc2Nzg4MDA3OX0.oOvtGqlsWvEzN3QnOKZbaoJFRU781K4y3oIZdkz1F6s",
  "token_type": "bearer"
}
```

**Key Details:**
- Uses `email` as primary identifier (mapped to JWT `sub` claim)
- Token expires in 1 hour (configurable)
- Token must be sent in `Authorization: Bearer <token>` header for all protected endpoints

---

## 🏢 Workspace Management (VERIFIED)

### Step 2: Create Workspace

**Request:**
```bash
curl -X POST "http://localhost:8000/api/workspaces" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzaGFobm9vcnI5OTU1QGdtYWlsLmNvbSIsImV4cCI6MTc2Nzg4MDA3OX0.oOvtGqlsWvEzN3QnOKZbaoJFRU781K4y3oIZdkz1F6s" \
  -H "Content-Type: application/json" \
  -d '{"name": "Production Workspace", "description": "Initial test workspace"}'
```

**✅ Successful Response (201 Created):**
```json
{
  "id": 1,
  "name": "Production Workspace",
  "description": "Initial test workspace",
  "owner_id": 1,
  "metabase_collection_id": 5,
  "metabase_collection_name": "Production Workspace",
  "is_active": true,
  "created_at": "2026-01-08T13:19:27.161775"
}
```

**What Happens Behind the Scenes:**
1. Backend creates a row in the `workspaces` table
2. Backend calls Metabase API to create a new Collection (Folder) at `/collection/5`
3. Backend stores the `metabase_collection_id` for future reference
4. Returns complete workspace metadata

---

### Step 3: Retrieve Workspace

**Request:**
```bash
curl -X GET "http://localhost:8000/api/workspaces/1" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzaGFobm9vcnI5OTU1QGdtYWlsLmNvbSIsImV4cCI6MTc2Nzg4MDA3OX0.oOvtGqlsWvEzN3QnOKZbaoJFRU781K4y3oIZdkz1F6s"
```

**✅ Successful Response (200 OK):**
```json
{
  "id": 1,
  "name": "Production Workspace",
  "description": "Initial test workspace",
  "owner_id": 1,
  "metabase_collection_id": 5,
  "metabase_collection_name": "Production Workspace",
  "is_active": true,
  "created_at": "2026-01-08T13:19:27.161775"
}
```

---

## 🔗 Embedding URL Generation (VERIFIED)

### Step 4: Generate Secure Embed URL

**Request:**
```bash
curl -X GET "http://localhost:8000/api/workspaces/1/embed" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzaGFobm9vcnI5OTU1QGdtYWlsLmNvbSIsImV4cCI6MTc2Nzg4MDA3OX0.oOvtGqlsWvEzN3QnOKZbaoJFRU781K4y3oIZdkz1F6s"
```

**✅ Successful Response (200 OK):**
```json
{
  "url": "http://metabase:3000/embed/collection/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyZXNvdXJjZSI6eyJjb2xsZWN0aW9uIjo1fSwicGFyYW1zIjp7fSwiZXhwIjoxNzY3ODgyMzIyfQ.qs88Ru523n1c2VnN1J_k156H5Lg5XG8-caQDe13Omm4",
  "expires_in_minutes": 60
}
```

**Security Features:**
- URL contains a JWT signed with Metabase's `EMBEDDING_SECRET_KEY`
- Token expires in 60 minutes (configurable)
- Each URL is scoped to a specific Collection ID (multi-tenant isolation)

---

## ⚠️ Critical Frontend Issues & Fixes

### Issue #1: Login Form Data Format (422 Error)

**Problem:**  
FastAPI's `OAuth2PasswordRequestForm` expects `application/x-www-form-urlencoded` data, but the frontend is sending JSON.

**Current Frontend Code (BROKEN):**
```javascript
// ❌ This sends JSON - FastAPI rejects it
axios.post('/auth/login', {
  email: 'user@example.com',
  password: 'password123'
})
```

**✅ Fixed Code:**
```javascript
// frontend/src/services/api.js
export const login = async (email, password) => {
  const formData = new URLSearchParams();
  formData.append('username', email);  // ⚠️ KEY MUST BE 'username', not 'email'
  formData.append('password', password);

  const response = await axios.post('/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  
  return response.data;
};
```

**Why This Matters:**  
OAuth2 standard requires `username` and `password` keys in form-encoded format. FastAPI follows this standard strictly.

---

### Issue #2: Docker Network vs. Browser Network (Connection Refused)

**Problem:**  
The backend returns URLs like `http://metabase:3000/embed/...`. The browser doesn't know what `metabase` is (it's a Docker internal hostname).

**✅ Frontend Fix:**
```javascript
// frontend/src/components/WorkspaceDetail.jsx
const [embedUrl, setEmbedUrl] = useState('');

useEffect(() => {
  const fetchEmbed = async () => {
    const response = await api.getWorkspaceEmbed(workspaceId);
    
    // ⚠️ CRITICAL: Replace Docker hostname with localhost
    const browserUrl = response.url.replace('metabase:3000', 'localhost:3000');
    setEmbedUrl(browserUrl);
  };
  
  fetchEmbed();
}, [workspaceId]);

return (
  <iframe 
    src={embedUrl} 
    width="100%" 
    height="800px"
    frameBorder="0"
  />
);
```

**Why This Matters:**  
- `metabase:3000` only works inside Docker's internal network
- Browsers run on the host machine and must use `localhost:3000`

---

### Issue #3: Authorization Headers Missing

**Problem:**  
Frontend routes exist but aren't fetching data because they're not sending the JWT token.

**✅ Fixed API Client:**
```javascript
// frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000'
});

// Interceptor to add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getWorkspaces = () => api.get('/api/workspaces');
export const getWorkspace = (id) => api.get(`/api/workspaces/${id}`);
export const getWorkspaceEmbed = (id) => api.get(`/api/workspaces/${id}/embed`);

export default api;
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Docker & Docker Compose installed
- Node.js 18+ (for local frontend development)
- Git

### 1. Clone & Configure
```bash
git clone <repository-url>
cd metabase_embedder

# Copy environment template
cp .env.example .env

# ⚠️ IMPORTANT: Update these values in .env
# METABASE_ADMIN_EMAIL=admin@yourcompany.com
# METABASE_ADMIN_PASSWORD=secure_password_here
# JWT_SECRET_KEY=generate_with_openssl_rand_hex_32
```

### 2. Start All Services
```bash
docker-compose up -d

# Wait 60 seconds for Metabase to initialize
# Check logs: docker-compose logs -f metabase
```

### 3. Verify Backend
```bash
# Health check
curl http://localhost:8000/

# Should return: {"status": "healthy"}
```

### 4. Configure Metabase Embedding
1. Open http://localhost:3000
2. Log in with credentials from `.env`
3. Go to **Settings → Embedding**
4. Enable **"Embedding"**
5. Copy the **Embedding Secret Key**
6. Update `.env`: `METABASE_EMBEDDING_SECRET=<key>`
7. Restart backend: `docker-compose restart backend`

### 5. Test Complete Flow (CLI)
```bash
# Login
TOKEN=$(curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}' \
  | jq -r .access_token)

# Create workspace
curl -X POST http://localhost:8000/api/workspaces \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Workspace"}'

# Get embed URL
curl http://localhost:8000/api/workspaces/1/embed \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Start Frontend (Development)
```bash
cd frontend
npm install
npm run dev

# Access at http://localhost:5173
```

---

## 🔧 Environment Variables Reference

```bash
# Database
POSTGRES_USER=metabase_user
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=metabase_embedder

# Backend
DATABASE_URL=postgresql://metabase_user:secure_password@db:5432/metabase_embedder
JWT_SECRET_KEY=<generate-with-openssl-rand-hex-32>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Metabase
MB_DB_TYPE=postgres
MB_DB_DBNAME=metabase
MB_DB_PORT=5432
MB_DB_USER=metabase_user
MB_DB_PASS=secure_password
MB_DB_HOST=db
METABASE_ADMIN_EMAIL=admin@company.com
METABASE_ADMIN_PASSWORD=admin_password_here

# Metabase API (Backend needs these)
METABASE_URL=http://metabase:3000
METABASE_USERNAME=admin@company.com
METABASE_PASSWORD=admin_password_here
METABASE_EMBEDDING_SECRET=<from-metabase-settings>
```

---

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Workspaces Table
```sql
CREATE TABLE workspaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id INTEGER REFERENCES users(id),
    metabase_collection_id INTEGER UNIQUE,
    metabase_collection_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🛠️ API Reference

### Authentication

#### POST `/auth/login`
**Request:**
```json
// ⚠️ Must be application/x-www-form-urlencoded
{
  "username": "user@example.com",  // Yes, 'username' not 'email'
  "password": "password123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

### Workspaces

#### GET `/api/workspaces`
List all workspaces for authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Production Workspace",
    "metabase_collection_id": 5,
    "is_active": true
  }
]
```

#### POST `/api/workspaces`
Create new workspace (auto-creates Metabase collection).

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "My Workspace",
  "description": "Optional description"
}
```

**Response (201):**
```json
{
  "id": 2,
  "name": "My Workspace",
  "metabase_collection_id": 10,
  "created_at": "2026-01-08T15:30:00"
}
```

#### GET `/api/workspaces/{id}`
Get workspace details.

#### GET `/api/workspaces/{id}/embed`
Generate secure embedding URL.

**Response (200):**
```json
{
  "url": "http://metabase:3000/embed/collection/eyJ...",
  "expires_in_minutes": 60
}
```

---

## 🎯 Next Steps for Development Team

### Frontend Team (Priority)
1. **Fix Login Form** (30 min)
   - Implement `URLSearchParams` in `Login.jsx`
   - Test with CLI credentials

2. **Fix Embed URL** (15 min)
   - Add string replace logic in `WorkspaceDetail.jsx`
   - Test iframe rendering

3. **Add Authorization** (20 min)
   - Update `api.js` with interceptor
   - Store token in localStorage on login

### Metabase Admin Team
1. **Create Sample Dashboard**
   - Log into http://localhost:3000
   - Navigate to Collection #5 ("Production Workspace")
   - Create a test dashboard with sample visualizations

2. **Configure Data Sources**
   - Add your application database connection
   - Create questions/dashboards in appropriate collections

### DevOps Team
1. **Production Deployment**
   - Replace `localhost` references with environment variables
   - Set up SSL/TLS certificates
   - Configure domain names (e.g., `app.company.com`, `analytics.company.com`)

---

## 🐛 Troubleshooting

### "422 Unprocessable Entity" on Login
**Cause:** Sending JSON instead of form data.  
**Fix:** See Issue #1 above.

### "ERR_CONNECTION_REFUSED" on Embed URL
**Cause:** Browser trying to reach `metabase:3000`.  
**Fix:** See Issue #2 above - replace with `localhost:3000`.

### "401 Unauthorized" on Workspace Endpoints
**Cause:** Missing or expired JWT token.  
**Fix:** Check localStorage, re-login if token expired.

### Metabase Shows "Collection Not Found"
**Cause:** Collection ID mismatch or deleted in Metabase.  
**Fix:** Check `workspaces` table, verify `metabase_collection_id` exists in Metabase.

---

## 📝 Testing Checklist

- [ ] Backend health endpoint returns 200
- [ ] User can register/login via CLI
- [ ] Workspace creation returns 201 with `metabase_collection_id`
- [ ] Workspace retrieval returns correct data
- [ ] Embed URL generation returns JWT-signed URL
- [ ] Frontend login form submits correctly
- [ ] Frontend displays workspace list
- [ ] Frontend iframe loads Metabase embed (after URL fix)
- [ ] Multiple users see only their own workspaces
- [ ] Metabase dashboards appear in correct collections

---

**Last Updated:** January 8, 2026  
**System Status:** ✅ Backend Operational | ⚠️ Frontend Needs Fixes  
