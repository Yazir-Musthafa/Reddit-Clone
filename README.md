# Reddit Clone

A full-stack Reddit clone. The frontend uses **React** and **Vite**, preserving the original HTML templates and CSS, and the backend is **Node.js + Express** with **MongoDB** (Mongoose).

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, React Router, React Context, JavaScript, existing HTML templates and CSS |
| Frontend tooling | Vite 8, with a multi-page build and React hot reload |
| Backend | Node.js and Express 5 |
| Database | MongoDB through Mongoose |
| Browser tests | Playwright; PNG comparisons with Pixelmatch |

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

## Setup

**Requirements:** Node.js 22.12+, npm, and MongoDB. The `npm run db` command requires `mongod` to be installed and available on your PATH. A MongoDB Atlas URI can be used instead.

Run **all commands from the project root**, the folder containing `package.json` (named `awt2` on the original local machine). There is no separate install inside `frontend/` or `server/`.

```bash
# From the project root
npm install
```

The development defaults work without an `.env` file. To customize them, copy `.env.example` to `.env`. The default database is `mongodb://127.0.0.1:27017/reddit_clone`.

## Run the app

### Database — Terminal 1

```bash
npm run db
```

This starts MongoDB on port **27017** and keeps its files in `.data/db/`. Leave the terminal running. If MongoDB is already running, or you use Atlas, skip this command and configure `MONGODB_URI` if needed.

### Backend and built React app — Terminal 2

```bash
npm start
```

This automatically runs the Vite build, then starts Express on **http://localhost:3000**. Express serves both the React build from `dist/` and the `/api` endpoints. No separate frontend process is needed to use this version.

### React frontend with live updates — optional Terminal 3

```bash
npm run dev:frontend
```

Open **http://localhost:5173** when editing frontend code. Vite provides React hot reload and forwards `/api` and `/uploads` requests to the backend on port 3000. Keep Terminal 2 running for the backend.

### Start frontend and backend together for development

Instead of Terminals 2 and 3, run:

```bash
npm run dev
```

This builds once, starts Express with Node's file watcher, and starts Vite. Open **http://localhost:5173**; keep MongoDB running separately. Use this command instead of starting another backend on the same port. Press `Ctrl+C` in a terminal to stop its processes.

| Command | Purpose |
| --- | --- |
| `npm run db` | Start local MongoDB on port 27017 |
| `npm start` | Build React and start Express on port 3000 |
| `npm run dev:frontend` | Start the Vite frontend on port 5173; requires the backend |
| `npm run dev` | Start frontend and backend together for development |
| `npm run build` | Generate `dist/` without starting a server |
| `npm run test:e2e` | Run browser interaction tests |
| `npm run test:visual` | Compare screenshots against a local baseline |
| `npm run seed` | **Delete and re-seed the configured database** |

The development proxy targets port 3000. If you change the backend `PORT`, update the proxy targets in `vite.config.mjs` too.

## Demo account

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

## React frontend architecture

The migration preserves the existing `.html` URLs, query parameters, CSS, assets, API endpoints, and cookie authentication. It uses a multi-page React setup with React Router matching the existing page paths. Same-document query navigation uses `useNavigate`; ordinary cross-page anchors still load a document so existing page controllers and polling timers retain their lifecycle.

- `frontend/react/main.jsx` starts React inside `BrowserRouter` and `AuthProvider`; `App.jsx` uses `Routes`/`Route`, renders the shared layout, and lazy-loads the matching page component.
- `AuthContext.jsx` shares the current session through `createContext`/`useContext`. Its provider uses `useSyncExternalStore` to subscribe to the existing session store. Every independently mounted view root receives a provider; community membership updates create a new session snapshot.
- `CommentComposer.jsx` is a reusable controlled React form for comments, replies and edits. It handles validation, keyboard submission, pending state, duplicate prevention, retry and cancellation.
- `Feed.jsx`, `PostCard.jsx`, and `Toasts.jsx` use React state for their interactive UI.
- Other screens use template-backed React views with the existing form and interaction controllers. `render.jsx` converts HTML templates into React elements and unmounts nested views before replacement. This is a compatibility-oriented migration, not a complete rewrite of every controller into React hooks.
- Component templates are bundled by Vite instead of fetched as HTML at runtime.
- The rich-text editor remains an uncontrolled `contenteditable` region to preserve browser selection, paste, and toolbar behavior.
- Backend business logic and MongoDB models remain separate from the frontend. Express serves the generated frontend from `dist/`.

## Module V syllabus map

| Topic | Working example |
| --- | --- |
| React overview and getting started | `frontend/react/main.jsx`, `App.jsx`, `vite.config.mjs`, package scripts |
| State management | `Feed.jsx`: sorting, pagination, loading, view; `PostCard.jsx`: menus and voting |
| Event handling | `Feed.jsx` dropdown `onClick`; `CommentComposer.jsx` `onChange`, `onSubmit`, `onKeyDown` |
| Conditional rendering | `App.jsx` optional right column; feed loading/error/empty branches; comment Cancel button |
| Components | `App`, `PageLayout`, `Feed`, `Dropdown`, `PostCard`, `CommentComposer`, `Toasts`, `Markup` |
| Styling components | Existing CSS, responsive media queries, dynamic `className`, toast inline styles |
| State in the component tree | Feed owns shared controls and passes props to cards; local card/form state; stable list keys |
| React Context | `AuthContext.jsx`: `AuthProvider` and `useAuth`; consumed by Feed and PostCard |
| useEffect | Feed fetching, IntersectionObserver and cleanup; composer focus; toast timers |
| Hooks | `useState`, `useEffect`, `useContext`, `useRef`, `useMemo`, `useCallback`, `useReducer`, `useLayoutEffect`, `useSyncExternalStore`; custom `usePage` and `useAuth`; Router `useNavigate` |
| React Router | `BrowserRouter` in `main.jsx`; `Routes`/`Route`/`useNavigate` in `App.jsx`; `navigation.js` adapts existing query navigation |
| Forms in React | Controlled `CommentComposer`; existing uncontrolled settings and rich-text forms remain compatible |
| Deployment and/or testing | Vite production build served by Express; Playwright interactions and screenshot comparisons |

The syllabus says “Hooks in React”, not that every Hook in the React library must be used. Each Hook here has a functional role. The reducer in `PostCard` is currently a compatibility refresh counter, not a full reducer-based data model. This is still a hybrid frontend; some handlers and forms use native browser APIs. React Router does not turn all cross-page links into SPA navigation.

## Testing

With MongoDB running, install the test browser once and run the interaction suite:

```bash
npx playwright install chromium
npm run test:e2e
```

Playwright starts a separate application server on port **3002** using the database **`reddit_clone_react_test`** on the same MongoDB instance. Test sessions and reports are ignored by Git.

The Module V update passed **12 browser tests**, covering feed controls and navigation; post voting, saving, hiding and undo; post/comment editing and deletion; replies; image uploads and draft restore; profiles and preferences; community creation and mod settings; custom feeds; chats and notifications; careers navigation and validation; press inquiries; login/logout; and six-step signup. Additional checks cover Context-driven updates across post cards, comment failure/retry and duplicate prevention, keyboard submission, cancellation, and restoring feed filters with browser Back.

**52 screenshot comparisons** after the Module V update matched the pre-migration baseline, covering all 11 page entries and selected tab, guest/member, mobile, and dark-mode states. These checks do not guarantee every function or edge case: password-reset/code-login flows, video uploads, actual resume submission, account deletion, all permission combinations, and cross-browser behavior were not fully tested.

Visual comparisons require local baseline screenshots and API fixtures in `.data/react-parity/`; they are **not included in a fresh clone**. Capture a baseline against the pre-migration checkout (`b9a91e9`) using the current visual runner, then compare against the React app with the same database:

```bash
# Capture while the pre-migration app is running
BASE_URL=http://localhost:3000 node tests/visual-parity.mjs --capture

# Compare after starting the React app
npm run test:visual
```

The runner freezes the browser clock and replays captured API responses to make comparisons repeatable.

## Project structure

```text
frontend/
  *.html            document entries preserving existing page URLs
  react/            Router, AuthContext, Feed, PostCard, CommentComposer, Toasts, renderer
  css/              variables, reset, layout, responsive, pages (new UI + dark mode)
  js/
    api.js            fetch wrapper for /api
    auth-state.js     current session
    shell.js          renders shared React view regions on every page
    router.js         Home / Popular / News / All / Explore / custom-feed views
    interactions.js   login, sign-up wizard, password reset; re-exports React toasts
    ui.js             dialogs, report, join helpers
    pages/            React page components and existing page controllers
  components/       header, search, sidebar, feed, post, explore, chats,
                    community-modal, post-create, popular-communities, footer
  assets/           static logos and image assets
server/
  server.js         Express app (serves /api and the built React frontend)
  config.js, seed.js
  models/           User, Community, Post, Comment, Vote, Draft, Message, Notification, Report, VerificationCode
  routes/           auth, posts, comments, communities, users, misc (search, drafts, chats, notifications, uploads)
  utils/            sanitizing, ranking, serializers, access rules, votes, achievements, mailer
uploads/            user-uploaded images and videos
.data/              local MongoDB files, private resumes, local test artifacts (ignored)
dist/               generated production build (ignored by Git)
scripts/dev.cjs     starts the backend watcher and Vite together
tests/              browser interactions and visual parity checks
vite.config.mjs     multi-page React build and development proxy
playwright.config.mjs  isolated browser-test server configuration
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
