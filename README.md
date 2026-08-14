# Friend Group

A full-stack social app built on the PERN stack (PostgreSQL, Express, React, Node) with real-time features powered by Socket.IO. Friends share photos and videos, like and comment on posts, chat directly with each other, and get live notifications — all without any "friend request" step.

## Features

- **Auth** — register/login with JWT stored in an httpOnly cookie
- **Roles** — every user defaults to `user`; an `admin` account can upload media
- **Notes** — private notes, CRUD, scoped to the logged-in user
- **Profiles** — editable profile with photo, bio, phone, and address; public profiles are viewable by hovering any user's avatar anywhere in the app
- **Media feed** — admin-uploaded photos and videos, browsable by category (All / Photos / Videos)
- **Likes & comments** — any logged-in user can like or comment on media; see who liked a post
- **Real-time chat** — direct messaging between any two users, no friend request needed
- **Notifications** — live, real-time alerts for likes, comments, and new messages

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React (Vite), React Router, Tailwind CSS, Axios, Socket.IO client |
| Backend | Node.js, Express, Socket.IO |
| Database | PostgreSQL |
| Auth | JWT + httpOnly cookies, bcrypt |
| File uploads | Multer (local disk storage) |

## Project structure

```
friend-group/
├── backend/
│   ├── config/          # db connection
│   ├── middleware/       # protect, isAdmin, optionalAuth
│   ├── routes/            # auth, notes, profiles, media, messages, notifications
│   ├── socket/            # Socket.IO setup + auth
│   ├── utils/              # shared helpers (e.g. createNotification)
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── api/            # axios helper modules per feature
│   │   ├── components/  # Navbar, Footer, NotificationBell, UserHoverAvatar, etc.
│   │   ├── pages/          # Home, Login, Register, Chat, Notes
│   │   └── socket.js     # shared Socket.IO client instance
│   └── ...
└── sql/
    ├── 01_add_role_and_media.sql
    ├── 02_likes_comments.sql
    └── 03_chat_notifications.sql
```

## Getting started locally

### Prerequisites
- Node.js 18+
- A PostgreSQL database (local install, or a free hosted one like [Neon](https://neon.tech) or [Supabase](https://supabase.com))

### 1. Clone and install

```bash
git clone <your-repo-url>
cd friend-group

cd backend && npm install
cd ../frontend && npm install
```

### 2. Set up the database

Run the SQL files in `sql/` against your database, in order, plus your original `users`/`notes` table setup if not already present:

```bash
psql <your-connection-string> -f sql/01_add_role_and_media.sql
psql <your-connection-string> -f sql/02_likes_comments.sql
psql <your-connection-string> -f sql/03_chat_notifications.sql
```

Then promote one account to admin (edit the email first):

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### 3. Environment variables

Create `backend/.env`:

```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=friend_group
DB_USER=your_db_user
DB_PASSWORD=your_db_password
JWT_SECRET=some-long-random-string
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### 4. Run it

```bash
# terminal 1
cd backend && npm run dev

# terminal 2
cd frontend && npm run dev
```

Visit `http://localhost:5173`.

## Deploying for free

See the deployment guide covered in project chat — short version: Postgres on Neon/Supabase, backend on Render (needs WebSocket support, unlike serverless platforms), frontend on Vercel or Netlify. Remember to:
- Replace hardcoded `localhost` URLs with environment variables on both ends
- Set `secure: true` and `sameSite: 'None'` on cookies in production (frontend and backend live on different domains)
- Update CORS origins on both the Express app and the Socket.IO server to your live frontend URL

## License

MIT — feel free to use this as a learning reference or starting point for your own project.
