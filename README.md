# MySite Project

This is the student team's website project for the coding course.

## Environment Overview

You are working inside a containerized workspace with:

- **VS Code: (code-server)** accessible at `https://code-server-container-platform.parami-ai.org/`
- **Live preview** accessible at `https://mysite-container-platform.parami-ai.org/`
- **Build tool**: Vite v8 dev server with hot-module replacement (HMR)
- **Project directory**: `/home/student/mysite`

Students log in through the portal at `https://portal-container-platform.parami-ai.org/` using their Team ID and password. Once authenticated, the same session cookie grants access to both code-server and the live preview subdomains.

## How MySite Is Served

- Vite runs inside this container on port `8080` and binds to `0.0.0.0`.
- Nginx (the central gateway) authenticates the user via the `ccp_session` cookie, then proxies `https://mysite-container-platform.parami-ai.org/` to this Vite instance.
- The Vite config (`vite.config.js`) allows requests from the platform domain and supports WebSocket HMR tunneling through nginx.
- Any file saved under `/home/student/mysite` is reflected immediately in the browser preview thanks to Vite HMR.

## Development Guidelines

- Keep the site as a **static site** (HTML, CSS, JavaScript, images, fonts).
- Avoid server-side runtimes or frameworks that require a backend.
- The final site should be buildable with `vite build`, producing a `dist/` folder of static assets.

## Deployment Target

Later in the course, students are expected to push their site to **GitHub** and host it via **GitHub Pages** (or any other simple static hosting service such as Netlify, Vercel, or Cloudflare Pages).

Therefore:

- Use **relative paths** for assets (`./images/logo.png` instead of absolute paths).
- Ensure the site works when served from a subdirectory or a custom domain.
- Do not rely on backend APIs or server-side rendering.
- The `dist/` output after `vite build` should contain everything needed to host the site statically.

## Available Commands

From `/home/student/mysite`:

- `vite` — start the dev server (already running in the background)
- `vite build` — build the site for production into `dist/`
- `vite preview` — preview the production build locally

## Git

This directory is initialized as a Git repository. Students should commit their work regularly and push to GitHub when instructed.
