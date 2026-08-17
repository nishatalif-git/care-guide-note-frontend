# Secure Note-Taking Application — Frontend

A deliberately plain **Next.js App Router + TypeScript** client for the Secure Note-Taking API.

The frontend is intentionally unstyled and unoptimised. Its purpose is to demonstrate the backend API end to end rather than provide a polished UI.

## Tech Stack

- Next.js
- App Router
- TypeScript
- No UI library
- No template

## Requirements

- Node.js
- The backend API running on `http://localhost:4000`

## Setup

```bash
cd care-guide-note-frontend
cp .env.example .env.local
npm install
npm run dev
```

The frontend runs at:

```text
http://localhost:3000
```

Make sure the backend is running separately.

## Backend Integration

The frontend communicates with the backend REST API.

The API client is located at:

```text
frontend/lib/api.ts
```

It provides the fetch wrapper and token storage used by the application.

The backend is expected to be configured to allow the frontend origin through CORS.

## Application Areas

The frontend contains pages/components for:

```text
app/
  login
  notes
  admin/users
  insights
  posts

components/
  Nav
  Pager
  PostsClient

lib/
  api.ts
```

### Login

The login page authenticates against:

```http
POST /api/auth/login
```

The returned token is used for authenticated API requests.

### Notes

The notes area consumes the notes API for:

- Creating notes.
- Listing notes.
- Reading notes.
- Updating owned notes.
- Deleting notes.

Admins can use the backend's wider note-listing permissions.

### Posts

The posts area displays the public feed:

```http
GET /api/posts
```

The feed supports pagination and author filtering.

Authors can also be used to navigate to the public posts-by-user view:

```http
GET /api/users/:id/posts
```

### Admin Users

The admin users area uses the admin-only user endpoints:

```http
GET    /api/users
POST   /api/users
GET    /api/users/:id
PATCH  /api/users/:id
DELETE /api/users/:id
```

Non-admin users are rejected by the backend.

### Insights

The Insights page exercises the grouped-by-interest aggregation:

```http
GET /api/users/insights/by-interest
```

This view is available to admins.

## Pagination

The frontend uses the backend pagination contract:

```json
{
  "data": [],
  "page": 1,
  "limit": 10,
  "total": 87,
  "totalPages": 9
}
```

The shared pagination component is:

```text
components/Pager
```

The backend enforces:

- Default page: `1`
- Default limit: `10`
- Maximum limit: `100`

## Project Structure

```text
care-guide-note-frontend/
  app/
    login
    notes
    admin/users
    insights
    posts
  components/
    Nav
    Pager
    PostsClient
  lib/
    api.ts
```

## Design Approach

The frontend intentionally stays simple:

- No UI component library.
- No template.
- Minimal styling.
- API-driven pages.
- Shared navigation and pagination components.
- The focus is demonstrating correct end-to-end integration with the backend.

## Running the Full Application

Start the backend in one terminal:

```bash
cd backend
npm install
cp .env.example .env
npm run seed
npm run dev
```

Then start the frontend in another terminal:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:3000
```

Use the seeded accounts from the backend README to test user and admin functionality.
