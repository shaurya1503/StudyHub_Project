# StudyHub – B.Tech Capstone Project (Prototype)
##Live Demo
https://studyhub-project-ibon.onrender.com/

A web platform for university students: semester-wise notes and PYQs (Study Point) plus a student community.

## Folder structure
- `frontend/` – HTML, CSS and JavaScript prototype (works with sample data; open `frontend/index.html` in a browser)
- `backend/`  – Node.js + Express.js API with MongoDB (Mongoose) models and JWT authentication

## Run the project
1. Install Node.js (LTS). In the `backend` folder run `npm install`.
2. Copy `.env.example` to `.env` and set `MONGO_URI` (Atlas string) and `JWT_SECRET` (any long random text).
3. `npm start` -> open http://localhost:5000 (backend also serves the frontend).
4. Make an admin: register on the site, then `node makeAdmin.js your@email.com`.

## API (current)
| Method | Route | Access |
|---|---|---|
| POST | /api/auth/register | public |
| POST | /api/auth/login | public |
| GET | /api/resources?semester=&subject=&type=&q= | public |
| POST | /api/resources | logged-in |
| DELETE | /api/resources/:id | admin |
| GET | /api/posts | public |
| POST | /api/posts | logged-in |
| POST | /api/posts/:id/comments | logged-in |
| DELETE | /api/posts/:id | admin |

## Status
Done: frontend connected to API, login/register, file upload (Multer), posts/comments, admin delete.
Pending: testing, deployment, documentation.
