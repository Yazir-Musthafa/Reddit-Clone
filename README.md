# Reddit Clone

A full-stack Reddit clone. The frontend is plain HTML, CSS and ES-module JavaScript (no framework, no build step), and the backend is **Node.js + Express** with **MongoDB** (Mongoose).

## Features

- **Accounts:** a 6-step sign-up with email verification, log in with username or email, one-time code log in, forgot-password reset, change email or password, and delete account.
- **Communities:** create them (Public, Restricted or Private; 18+ flag; topic), join and leave, rules, moderators, approved users, and mod tools for editing the description, icon, colours, type and rules.
- **Posts:** rich-text body (sanitized on the server), optional link, image and video uploads (drag and drop or paste), tags (OC, Spoiler, NSFW…), drafts, edit, and delete (by the author or a moderator).
- **Feeds:** Home (your communities), Popular, News, All and custom feeds, sorted by Best, Hot, New, Top (by time range) or Rising, in card or compact view, with infinite scroll.
- **Voting and karma:** upvote and downvote posts and comments; authors earn post and comment karma.
- **Comments:** threaded replies, voting, edit, delete, collapse, OP badge, sorting, and share links to a single comment.
- **Discovery:** Explore by topic, header search with live suggestions, and a results page for posts, communities, comments and people.
- **Profiles:** posts, comments, saved, hidden, upvoted and downvoted tabs, achievements, and a karma and cake-day card.
- **Chats:** one-to-one messaging with unread counts. It refreshes itself while open.
- **Notifications:** alerts for replies to your posts and comments, new messages, and moderator actions.
- **Careers:** job listings with search and department, location and remote filters, job pages, an application form with resume upload (PDF or Word, kept private in `.data/resumes`), and "My applications" with withdraw.
- **Press:** press releases with category filters, a live "by the numbers" fact sheet, downloadable brand assets, and a media-inquiry form.
- **Also:** save, hide and report; recently viewed posts; dark mode; a mobile navigation drawer.

## Running it

**Requirements:** Node.js 18+ and MongoDB running locally (or a MongoDB Atlas URI).

```bash
npm install

# Terminal 1: start MongoDB with a data folder inside the project
npm run db

# Terminal 2: start the app
npm start            # or: npm run dev  (restarts on file changes)
```

Open **http://localhost:3000**.

On first start, the database is seeded with demo communities, posts, comments and users. Log in with:

| Username | Password |
| --- | --- |
| `demo_user` | `password123` |

The other demo accounts (`Pixel-Artisan99`, `Curious-Explorer409`, …) use the same password. To wipe the database and re-seed it, run `npm run seed`.

If you already run MongoDB elsewhere, skip `npm run db` and set `MONGODB_URI` (see `.env.example`).

### Email codes

Sign-up verification, one-time log in and password reset all send a 6-digit code. If `SMTP_HOST` isn't set, the code is printed in the server console and shown in the dialog. In production (`NODE_ENV=production`), SMTP is required, and so is `JWT_SECRET`.

### Not included

"Continue with Google / Apple / Phone" need OAuth or SMS provider credentials, so those buttons explain this and point you to email sign-in. Reddit's games, Premium, Earn and Ads open info pages instead. Job applications and media inquiries are stored in MongoDB (`jobapplications`, `pressinquiries`); there is no admin screen for reviewing them yet.

## Project structure

```text
index.html, submit.html, post.html, community.html, user.html,
search.html, settings.html, communities.html, careers.html,
press.html, page.html                                     ← pages
css/            variables, reset, layout, responsive, pages (new UI + dark mode)
js/
  api.js            fetch wrapper for /api
  auth-state.js     current session
  shell.js          loads header / sidebar / chats on every page
  router.js         Home / Popular / News / All / Explore / custom-feed views
  interactions.js   login, sign-up wizard, password reset, toasts
  ui.js             dialogs, report, join helpers
  pages/            one entry script per page
components/     header, search, sidebar, feed, post, explore, chats,
                community-modal, post-create, popular-communities, footer
server/
  server.js         Express app (serves /api and the static frontend)
  config.js, seed.js
  models/           User, Community, Post, Comment, Vote, Draft, Message, Notification, Report, VerificationCode
  routes/           auth, posts, comments, communities, users, misc (search, drafts, chats, notifications, uploads)
  utils/            sanitizing, ranking, serializers, access rules, votes, achievements, mailer
uploads/        user-uploaded images and videos
```

## API overview

All endpoints are under `/api`. Authentication uses an httpOnly cookie that is set on log in.

| Area | Endpoints |
| --- | --- |
| Auth | `GET /auth/me`, `POST /auth/request-code`, `/auth/verify-code`, `/auth/signup`, `/auth/login`, `/auth/login-code`, `/auth/reset-password`, `/auth/logout`, `GET /auth/check-username`, `/auth/suggest-username` |
| Posts | `GET /posts?feed=home\|popular\|news\|all\|custom&sort=best\|hot\|new\|top\|rising&t=day…&community=&page=`, `GET/PATCH/DELETE /posts/:id`, `POST /posts`, `POST /posts/:id/vote\|save\|hide\|report` |
| Comments | `GET/POST /posts/:id/comments`, `PATCH/DELETE /comments/:id`, `POST /comments/:id/vote\|report` |
| Communities | `GET /communities`, `/communities/topics`, `/communities/check-name`, `GET/PATCH /communities/:name`, `POST /communities`, `POST /communities/:name/join`, `POST /communities/:name/approved\|moderators`, `DELETE /communities/:name/approved/:username` |
| Users | `GET /users/:username`, `/users/:username/posts\|comments\|saved\|hidden\|upvoted\|downvoted`, `PATCH /users/me`, `POST /users/me/password\|email`, `DELETE /users/me`, `GET /users/me/communities`, `POST/PATCH/DELETE /users/me/feeds[/:id]` |
| Careers & Press | `GET /careers/jobs?q=&department=&location=&remote=`, `GET /careers/jobs/:slug`, `POST /careers/jobs/:slug/apply` (multipart), `GET /careers/applications`, `DELETE /careers/applications/:id`, `GET /press/releases`, `GET /press/releases/:slug`, `GET /press/stats`, `POST /press/inquiries` |
| Other | `GET /search?q=&type=posts\|communities\|comments\|people`, `GET /search/suggest`, `GET/POST/DELETE /drafts`, `GET /chats`, `GET/POST /chats/:username`, `GET /chats/unread`, `GET /notifications`, `POST /notifications/read-all`, `POST /uploads` |
