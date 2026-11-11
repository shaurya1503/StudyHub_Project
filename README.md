# StudyHub – B.Tech Capstone Project

Web platform for university students: semester-wise notes and PYQs (Study Point) plus a student community.
Stack: HTML, CSS, JavaScript | Node.js, Express.js | MongoDB (Mongoose) | JWT + bcrypt | Multer

## Folder structure
- `frontend/` – pages (index.html, style.css, app.js) – served by the backend
- `backend/`  – API, database models, file upload, seed script

## Run (one-time setup)
1. Install Node.js (LTS) and create a MongoDB Atlas free cluster (or use local MongoDB).
2. In the `backend` folder:
   ```
   npm install
   copy .env.example .env      (Mac/Linux: cp .env.example .env)
   ```
3. Open `.env` and set `MONGO_URI` and `JWT_SECRET`.
4. Add demo data (this clears old data): `npm run seed`
5. Start: `npm start`
6. Open **http://localhost:5000** in the browser.

## Demo logins (created by `npm run seed`)
- Admin:   admin@studyhub.com / admin123
- Student: student@studyhub.com / student123

## API
| Method | Route | Access |
|---|---|---|
| POST | /api/auth/register | public |
| POST | /api/auth/login | public |
| GET | /api/resources?semester=&subject=&type=&q= | public |
| POST | /api/resources (multipart, file) | logged-in |
| DELETE | /api/resources/:id | admin |
| GET | /api/posts | public |
| POST | /api/posts | logged-in |
| POST | /api/posts/:id/comments | logged-in |
| DELETE | /api/posts/:id | admin |
