# Reddit Landing Page Recreation

A pixel-accurate, component-structured recreation of the **Reddit pre-authentication landing and feed page**. Built using pure HTML5, CSS3, and modern Vanilla ES6 JavaScript without external frameworks or dependencies.

## 🚀 Features

- **Pixel-Accurate UI**: Faithfully recreates the three-column layout, header, left signup card, central post feed, right popular communities card, and footer links.
- **Component-Oriented Architecture**: Each major component (Header, Search, Left Sidebar, Feed, Post, Popular Communities, Footer) has its own independent `.html`, `.css`, and `.js` files.
- **Dynamic Component Loader**: Lightweight fetch-based component loader populating HTML templates into mounting points inside `index.html`.
- **Interactive Post Carousel**: Image slider controls with smooth transition, active indicator dots, and upvote/downvote vote counter logic.
- **Modal & Toast Feedback**: Interactive Sign Up / Log In buttons triggering custom pre-login modals and feedback toasts.
- **Fully Responsive**: Adapts seamlessly from Desktop (3 columns), Tablet (2 columns), to Mobile (1 column feed).

## 📁 Folder Structure

```text
reddit-landing/
├── index.html
├── components/
│   ├── header/
│   │   ├── header.html
│   │   ├── header.css
│   │   └── header.js
│   ├── sidebar/
│   │   ├── sidebar.html
│   │   ├── sidebar.css
│   │   └── sidebar.js
│   ├── search/
│   │   ├── search.html
│   │   ├── search.css
│   │   └── search.js
│   ├── feed/
│   │   ├── feed.html
│   │   ├── feed.css
│   │   └── feed.js
│   ├── post/
│   │   ├── post.html
│   │   ├── post.css
│   │   └── post.js
│   ├── popular-communities/
│   │   ├── communities.html
│   │   ├── communities.css
│   │   └── communities.js
│   └── footer/
│       ├── footer.html
│       ├── footer.css
│       └── footer.js
├── css/
│   ├── reset.css
│   ├── variables.css
│   ├── layout.css
│   └── responsive.css
├── js/
│   ├── app.js
│   ├── component-loader.js
│   └── interactions.js
└── assets/
    └── images/
```

## 🛠️ How to Run Locally

Because the project uses ES6 Modules and dynamic `fetch()` requests to load component templates, it must be served via a local web server (instead of double-clicking `index.html`).

You can use any standard static server:

### Option 1: Using Node `npx serve`
```bash
npx serve .
```

### Option 2: Using Python
```bash
python3 -m http.server 8000
```
Then open `http://localhost:8000` in your web browser.
