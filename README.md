# Talk2PDF

Chat with your documents using AI. Upload multiple PDFs, Word files, PowerPoint presentations, or plain text simultaneously and ask questions, get interactive quizzes, get summaries, detect AI-generated content, and extract key information across all your files — all powered by RAG (Retrieval-Augmented Generation).

## Tech Stack

- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS v4 + shadcn/ui
- **Dark Mode**: next-themes (system / light / dark, persisted across sessions)
- **Animations**: Lottie (lottie-react) for auth pages visual panel
- **i18n**: Lightweight custom hook (FR / EN / AR)
- **Backend**: Python + FastAPI + LangChain
- **LLM**: OpenAI GPT-4o-mini
- **Embeddings**: OpenAI text-embedding-3-small
- **Vector DB**: Pinecone
- **Auth**: Supabase Auth (email + Google OAuth)
- **Database**: Supabase PostgreSQL via SQLAlchemy (documents, conversations, file storage)

## Prerequisites

- Node.js 18+
- Python 3.11+
- OpenAI API key
- Pinecone API key + an index named `chatpdf` (dimension: 1536, metric: cosine)
- Supabase project (for auth and PostgreSQL database)

## Setup

### 1. Clone and install frontend dependencies

```bash
npm install
```

### 2. Install backend dependencies

```bash
cd backend
python -m pip install -r requirements.txt
```

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your API keys:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
OPENAI_API_KEY=sk-your-key-here
PINECONE_API_KEY=pc-your-key-here
PINECONE_INDEX_NAME=chatpdf
NEXT_PUBLIC_API_URL=http://localhost:8000

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ-your-anon-key
SUPABASE_DB_URL=postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres
SUPABASE_JWT_SECRET=your-jwt-secret
```

### 4. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Authentication > Providers** and enable **Google** (requires Google Cloud OAuth credentials)
3. Copy your **Project URL**, **Anon Key** (Settings > API), **JWT Secret** (Settings > API), and **Database connection string** (Settings > Database > Connection string > URI, use "Transaction mode" pooler) into `.env.local`

### 5. Create Pinecone Index

Go to [Pinecone Console](https://app.pinecone.io/) and create an index:
- **Name**: `chatpdf`
- **Dimensions**: `1536`
- **Metric**: `cosine`

### 6. Run the application

**Terminal 1 -- Backend:**

```bash
cd backend
python -m uvicorn main:app --port 8000
```

**Terminal 2 -- Frontend:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Visit the landing page at `/` — a Humata-style SaaS page with full-screen background video, typewriter animation, feature cards, chat demo preview, and security section.
2. Click **Start for Free** to sign up, or **Try without login** to enter guest mode.
3. **Guest mode**: access the dashboard without an account (limited to 2 documents, no history saved, data lost on refresh). A banner warns you and a **Create account** button encourages registration.
4. After login/signup you are redirected to `/dashboard` with full access.
5. Use the **Explorer** section in the sidebar to upload documents (PDF, Word, PowerPoint, or TXT).
6. **Multi-Document Support**: Drag and drop multiple files at once on the home page to start a unified chat across all of them.
7. Wait for the documents to be processed and indexed -- a conversation is created automatically linking all uploaded files.
8. Select a conversation in **Discussions** in the sidebar and start asking questions.
9. **Attach More**: Click the **Paperclip** icon in the chat or header to add more documents to an existing discussion.
10. **Document Tabs**: Switch between different PDFs in the same viewer using the tabs at the top of the preview panel.
11. Right-click a conversation for options: rename, pin, export, reset, delete.
12. Click **New chat** in the top bar to start a new conversation on the same documents.
13. Click **View PDF** in the top bar to see the documents alongside the chat.
14. Click **Summarize** in the top bar to generate document summaries.
15. Source citations with page numbers and filenames appear below each AI response.
16. After each AI response, 2-3 suggested follow-up questions appear (based on combined document content).
17. Use the **Détecteur IA** tab for instant text analysis.
18. Use the **Résumé** tab to generate structured summaries (Global/Key Points) of any document.
19. Use the **QCM** tab to generate interactive quizzes with 10 questions and 3 difficulty levels.
20. Use the split-view dashboard to see your PDF while completing your Quiz or reading your Summary.
21. Search through your chat history with the search bar in the sidebar.

## Supported File Formats

| Format | Extensions | Notes |
|---|---|---|
| PDF | `.pdf` | Full page-by-page text extraction |
| Microsoft Word | `.docx`, `.doc` | Paragraph-level extraction |
| Microsoft PowerPoint | `.pptx` | Slide-by-slide text extraction |
| Plain Text | `.txt` | Direct text ingestion |

Maximum file size: **50 MB**

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/upload` | POST | Upload a document (optionally creates a chat session) |
| `/api/chat` | POST | Ask a question across one or more documents |
| `/api/chat/stream` | POST | Ask a question (streaming SSE + follow-up suggestions) |
| `/api/summary` | POST | Generate a document summary |
| `/api/quiz` | POST | Generate a 10-question MCQ quiz from documents |
| `/api/ai-detect` | POST | Analyze text for AI-generated content detection |
| `/api/documents` | GET | List user's uploaded documents |
| `/api/documents/{id}` | DELETE | Delete a document |
| `/api/documents/{id}/pdf` | GET | Serve document file |
| `/api/chats` | GET | List all chat sessions |
| `/api/chats` | POST | Create a new chat session |
| `/api/chats/{id}` | PATCH | Rename or pin/unpin a chat |
| `/api/chats/{id}` | DELETE | Delete a chat session |
| `/api/chats/{id}/documents` | POST | Attach an existing document to a chat |
| `/api/chats/{id}/reset` | POST | Clear all messages in a chat |
| `/api/chats/{id}/export` | GET | Export chat as JSON |
| `/api/chats/{id}/messages` | GET | Load chat messages |
| `/api/chats/{id}/messages` | POST | Save a message |

## Architecture

```
chatpdf-v0/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout + ThemeProvider + Toaster
│   ├── page.tsx                  # Landing page (Humata-style, pre-auth)
│   ├── dashboard/page.tsx        # Main app (sidebar + tabbed home + PDF viewer + chat)
│   ├── settings/page.tsx         # User settings page
│   ├── login/page.tsx            # Login page (two-column Humata-style layout)
│   ├── signup/page.tsx           # Signup page (two-column Humata-style layout)
│   ├── auth/callback/route.ts    # OAuth callback handler (redirects to /dashboard)
│   └── globals.css               # Tailwind v4 + shadcn theme (light + dark CSS variables)
├── components/                   # React components
│   ├── landing-header.tsx        # Landing page sticky header (logo + nav + auth buttons)
│   ├── hero-section.tsx          # Full-screen video background hero + typewriter effect
│   ├── features-section.tsx      # 4 feature cards (Chat, Summary, Quiz, AI Detector)
│   ├── chat-preview-section.tsx  # Simulated chat demo (ChatGPT-style preview)
│   ├── security-section.tsx      # Security/RGPD section with matrix rain animation
│   ├── landing-footer.tsx        # Multi-column footer with social links
│   ├── ai-detector.tsx           # AI content detector with gauge ring UI
│   ├── auth-visual-panel.tsx     # Two-column auth left panel (Lottie animation + dark design)
│   ├── auth-modal.tsx            # Login / signup / OTP modal (in-app)
│   ├── chat-interface.tsx        # Chat UI with streaming + follow-up suggestions
│   ├── chatpdf-logo.tsx          # Talk2PDF logo (sidebar & light variants)
│   ├── conversation-list.tsx     # Sidebar conversation list + context menu
│   ├── discussions-panel.tsx     # Grouped discussions panel in sidebar
│   ├── document-list.tsx         # Document explorer list
│   ├── history-panel.tsx         # Activity history panel (detector, summary, quiz)
│   ├── message-bubble.tsx        # Message bubble + Markdown rendering + expandable sources
│   ├── pdf-upload.tsx            # Drag & drop upload with progress (multi-format)
│   ├── pdf-viewer.tsx            # Document preview with PDF-only fallback
│   ├── summary-panel.tsx         # Inline summary panel
│   ├── summary-tab.tsx           # Summary tab with split-view + copy
│   ├── quiz-tab.tsx              # QCM generator with instant feedback & explanations
│   ├── theme-provider.tsx        # next-themes ThemeProvider wrapper
│   ├── theme-toggle.tsx          # Sun/Moon dark mode toggle button
│   └── ui/                       # shadcn/ui primitives
├── lib/
│   ├── api.ts                    # API client with auth headers + all endpoint helpers
│   ├── history.ts                # Client-side activity history (localStorage)
│   ├── i18n.ts                   # Lightweight i18n hook (FR/EN/AR)
│   ├── utils.ts                  # Tailwind utilities (cn)
│   └── supabase/                 # Supabase client utilities
│       ├── client.ts             # Browser client
│       ├── server.ts             # Server client (cookies)
│       └── middleware.ts         # Middleware session refresh (redirects to /dashboard)
├── middleware.ts                  # Next.js middleware (session refresh)
├── backend/
│   ├── main.py                   # FastAPI app + all endpoints (auth optional)
│   ├── auth.py                   # JWT verification (optional, guest mode supported)
│   ├── database.py               # SQLAlchemy models + CRUD (PostgreSQL, per-user)
│   ├── pdf_processor.py          # Multi-format extraction + chunking + Pinecone upsert
│   ├── rag_engine.py             # RAG pipeline (standard + streaming + follow-up suggestions)
│   ├── config.py                 # Environment config
│   └── requirements.txt          # Python dependencies (incl. python-docx, python-pptx)
├── public/
│   ├── 3202364-hd_1920_1080_25fps.mp4  # Landing page hero background video
│   ├── Connect with us.json      # Lottie animation for auth pages visual panel
│   ├── chatpdf-hero.png          # Dashboard 3D isometric illustration
│   ├── chatpdf-hero2.png         # Keyboard & mouse desk illustration
│   └── chatpdf-logo.png          # App logo icon
├── .env.local                    # API keys + Supabase config (gitignored)
├── .env.example                  # Template
└── package.json
```

---

## Changelog

### v5.0 -- Premium Light Mode & Landing Page Redesign (2026-04-03)
- **Full-bleed Video Background**: Video now covers the entire main area (header + content) on the dashboard home screen. Header is fully transparent over the video so the background extends edge-to-edge.
- **Adaptive Header**: Header automatically switches between transparent (on video/home screen) and solid white glass (`bg-white/80 backdrop-blur-xl`) when in chat/quiz/summary mode. Text and button colors adapt accordingly (white on video, dark on solid bg).
- **Distinct Beige Sidebar**: Sidebar background changed to a clearly visible warm beige (`#E8E0D8`) that stands out from the page, with darker hover/active states and properly contrasted text (`stone-700`).
- **White Text on Video**: Greeting ("Bonjour"), subtitle, tab buttons, and search bar all use white text with dark drop-shadows for readability over the video background.
- **Dark Overlay**: Video overlay switched from beige gradient to dark gradient (`rgba(0,0,0,0.25–0.50)`) to support white text with high contrast.
- **Light Mode Cards**: Action cards ("Importer un PDF", "Poser une question") use `bg-white/70` with black text, blue icons, and soft shadows instead of dark glassmorphism.
- **Conditional ThemeToggle**: Toggle icon adapts to context — white on video, dark gray on solid backgrounds. Accepts optional `className` prop for flexibility.
- **Landing Page Light Mode**: Complete light mode support across all landing page sections:
  - **Header**: Transparent by default, `bg-white/70` when scrolled. Logo switches between light/sidebar variants. Nav links and buttons use `stone-600` text.
  - **Hero**: Lighter video overlay (`bg-black/35`), white text with drop-shadows, gradient fade to beige `#F5F1EC`.
  - **Features**: Warm beige gradient background, white cards with `stone-200` borders and soft shadows.
  - **Chat Preview**: White chat window with `blue-50`/`stone-50` message bubbles and dark text.
  - **Security**: Beige background with white trust cards, Matrix rain hidden in light mode.
  - **CTA**: Beige gradient with dark text, adapted "Try as Guest" button.
  - **Footer**: Beige `#E8E3DE` background with `stone-500` link text and adapted social icons.
- **Theme Toggle on Landing Page**: Added sun/moon toggle button to the landing page header for easy mode switching.
- **Quiz Tab Bug Fix**: Fixed a critical bug where the "Générer le QCM" button was disabled after file upload. The issue was caused by state loss when the QuizTab component unmounted/remounted during the welcome-to-split-view transition. Added a `useEffect` to re-trigger the upload in the new component instance.
- **Chat Mode Light Styling**: When an active chat is open (no video), the page uses a warm beige background (`#F5F1EC`), white header with blur, and dark text — consistent with the overall light mode palette.

### v4.0 -- Immersive Dashboard Redesign (2026-04-03)
- **Video Background**: Dashboard home view now features a full-screen looping background video (`autoPlay`, `loop`, `muted`, `playsInline`) with a `poster` image fallback and `preload="metadata"` for performance.
- **Glassmorphism UI**: New CSS utility classes (`.glass`, `.glass-card`, `.glass-input`, `.glass-sidebar`, `.glass-header`) provide semi-transparent backgrounds with `backdrop-filter: blur()` and subtle borders across the entire interface.
- **Light/Dark Mode Parity**: Complete dual-theme support — every glass class, overlay, sidebar, header, tab, card, and text color now has distinct light (warm beige/cream palette) and dark (deep slate) variants using Tailwind `dark:` prefix throughout.
- **Video Overlay**: Warm beige gradient overlay in light mode (`rgba(247,243,238)`) and dark slate gradient in dark mode (`rgba(15,23,42)`) ensure text readability over the video.
- **Sidebar Redesign**: Glassmorphism sidebar with warm beige background (light) / dark translucent background (dark), rounded nav items with teal active state, refined search bar, subtle dividers, and adaptive auth area.
- **Header Redesign**: Glassmorphism header matching the sidebar palette — semi-transparent with backdrop blur, adaptive button/icon colors for both themes, seamless visual continuity.
- **Staggered Animations**: `@keyframes fade-slide-up` with delay classes (`.delay-100` to `.delay-600`) for a staggered entrance effect on hero, tabs, search bar, and action cards.
- **Responsive Tabs**: Tab pills use `grid-cols-2` on mobile, `inline-flex rounded-full` on desktop.
- **Responsive Cards**: Action cards use `grid-cols-1` on mobile, `grid-cols-2` on desktop.
- **Cleanup**: Removed unused `WelcomeIllustration` component, static hero images from the home view (kept as `poster` fallback), and unused imports (`Image`, `Link`, `UserPlus`).
- **CSS**: Added `.video-overlay`, `.glass-sidebar`, `.glass-header`, `@keyframes fade-slide-up`, `.animate-fade-slide-up`, `.delay-*` classes — all with `.dark` overrides.

### v3.1 -- Auth Pages Redesign & UX Improvements (2026-04-03)
- **Auth Pages Redesign**: Login and signup pages rebuilt with a modern Humata-style two-column layout — dark visual panel (left) with Lottie animation, dot grid pattern, and tagline; clean white form panel (right) with rounded inputs, show/hide password toggle, and trust badge.
- **Lottie Animation**: Replaced static logo with an animated "Connect with us" Lottie illustration on auth pages (`lottie-react`).
- **Logo Component Fix**: Fixed `ChatPdfLogo` sizing — removed the 2.4x overflow multiplier and absolute positioning; logo now renders cleanly within its container at all sizes (sidebar, header, footer, auth pages).
- **Logout Redirect**: Logging out now redirects to the landing page (`/`) instead of reloading the dashboard or redirecting to `/signup`.
- **New Component**: `auth-visual-panel.tsx` — shared left panel for login/signup with dark background, dot grid, radial glow, and Lottie animation.
- **New Dependency**: `lottie-react` for Lottie JSON animation rendering.
- **CSS**: Added `@keyframes float-label` animation for floating file-type labels.

### v3.0 -- Landing Page & Guest Mode (2026-04-03)
- **Landing Page**: New Humata-style SaaS landing page at `/` with full-screen background video, typewriter animation cycling through multiple phrases, feature cards, simulated chat demo, security section with matrix rain effect, CTA section, and multi-column footer with social links.
- **Route Restructure**: Dashboard moved from `/` to `/dashboard`; all auth redirects (login, signup, OAuth callback, middleware) now point to `/dashboard`.
- **Guest Mode**: Click "Try without login" to access the dashboard without authentication. Guest restrictions include: max 2 document uploads, no persistent history, data lost on page refresh, amber warning banner with PDF counter, and prominent "Create account" CTA in the sidebar.
- **New Components**: `landing-header.tsx`, `hero-section.tsx`, `features-section.tsx`, `chat-preview-section.tsx`, `security-section.tsx`, `landing-footer.tsx`.
- **CSS**: Added `@keyframes matrix-fall` animation for the security section background effect.

### v2.1 -- Dark Mode (2026-04-03)
- **Dark Mode Toggle**: Sun/Moon button now visible in the top bar for all users (logged-in and guest)
- **Full Token Coverage**: All components now use semantic CSS tokens (`bg-background`, `bg-card`, `text-foreground`, `bg-primary`, etc.) instead of hardcoded colors
- **Hero image fix**: Removed `mix-blend-mode: multiply` in dark mode (was making illustrations invisible); now uses `dark:mix-blend-normal` via Tailwind
- **Quiz & Summary dark support**: Difficulty buttons, answer options, explanations and result cards all adapt to dark mode
- **Auth modal dark support**: Input fields and Google sign-in button now use `bg-background`
- **Tab hover fix**: Home tab hover states now use `bg-background/80` instead of `bg-white/60`
- Powered by `next-themes` + Tailwind CSS `dark:` variant + `.dark` class on `<html>`

### v2.0 -- Multi-Document Management & Unified Chat (2026-03-29)
- **Attach Multiple Documents**: Link any number of PDFs, Word or TXT files to a single chat session.
- **Unified RAG Search**: AI now queries all documents in a session simultaneously, with source citations including filenames.
- **Tabbed PDF Viewer**: Seamlessly switch between multiple open documents in the preview panel.
- **Bulk Upload & Drop**: Support for dragging and dropping multiple files at once on the Home screen.
- **Enhanced Chat Header**: Displays document count and allows adding more files mid-conversation.
- **Bug Fixes**: Resolved hydration errors and React reference issues.

### v1.5 -- Split-View & UI Polish (2026-03-29)
- **Interactive Split-View**: Smooth integration of the PDF viewer in Quiz and Summary tabs (50/50 split).
- **PDF Toggle Controls**: Added "Voir le PDF" / "Masquer" button in the top bar for both Quiz and Summary views.
- **UI Responsiveness**: Fixed tab layouts (Detector/Summary/Quiz) with optimized padding to prevent vertical scrolling.
- **Consistent Illustrations**: Dashboard hero images (3D documents, keyboard/mouse) now persist across all nav tabs.
- **Fallback Viewer**: Added "Aperçu non disponible" UI in the viewer for Word, PowerPoint, and TXT files.
- **Improved UX**: Auto-opening of the PDF panel when a source document is uploaded for Quiz/Summary.

### v1.4 -- QCM (Quiz) Generator (2026-03-28)
- **Interactive Quizzes**: Generate 10-question MCQs (QCM) from any document with three difficulty levels (Facile, Moyen, Difficile).
- **Instant Correction**: Get immediate feedback on each answer with color coding (Green/Red) and a detailed explanation.
- **Independent Context**: The Quiz tab now handles its own file upload, separate from the main chat history.
- **Progressive UI**: Clean card-based quiz questions with smooth animations and interactive selection.
- **New API Endpoint**: `POST /api/quiz` leveraging the RAG pipeline for context-aware question generation.

### v1.3 -- UI Redesign (2026-03-07)
- Complete redesign of the main interface with a modern teal-themed sidebar
- Sidebar navigation with three sections: **Explorer**, **Détecteur IA**, **Mes Discussions**
- Tabbed home view with **Chat PDF**, **Détecteur IA**, and **Résumé** tabs when no chat is active
- Welcome illustration with animated floating elements (chat bubble, sparkle)
- Personalized greeting ("Bonjour, [user]") on the home page
- Search bar in the sidebar to filter conversations by title or document name
- Action cards on the home page for quick access to import and ask questions
- User avatar displayed in the top bar and sidebar
- Custom teal color palette with CSS custom properties (`--color-teal`, `--color-teal-light`, `--color-teal-dark`)
- Dark sidebar background (`#1e3a3a`) with refined contrast
- French localization throughout the UI

### v1.2 -- AI Content Detector (2026-03-07)
- New **Détecteur IA** feature to analyze text and determine if it was written by a human or AI
- Gauge ring visualization showing AI vs human probability percentages
- Verdict badge: AI-generated, Human-written, or Uncertain
- Detailed explanation paragraph with 3-6 supporting clues
- Minimum 50 characters required for analysis
- Backend endpoint `POST /api/ai-detect` using GPT-4o-mini with structured JSON output
- Accessible from both the sidebar navigation and the home page tabs

### v1.1 -- Multi-Format Document Support (2026-03-07)
- Upload now accepts **PDF**, **Word (.docx, .doc)**, **PowerPoint (.pptx)**, and **plain text (.txt)** files
- Word documents: paragraph-level text extraction using `python-docx`
- PowerPoint presentations: slide-by-slide text extraction using `python-pptx`
- TXT files: direct UTF-8 text ingestion
- All formats go through the same RAG pipeline (chunking → embedding → Pinecone)
- File type validation updated in both frontend and backend
- New Python dependencies: `python-docx`, `python-pptx`

### v1.0 -- Supabase Authentication + PostgreSQL (2026-03-04)
- User authentication via Supabase Auth (email + password and Google OAuth)
- Login and signup pages with modern card-based UI
- Guest mode: the app is fully usable without logging in
- Login/signup buttons in the sidebar for users who want to create an account
- When logged in, user email + logout button displayed in the sidebar
- Authenticated users get per-user data isolation (each user sees only their own documents and chats)
- Guest users share a common anonymous workspace
- Backend verifies Supabase JWTs (ES256/HS256) using PyJWT + JWKS and extracts user ID
- All API endpoints accept optional authentication (`Authorization: Bearer <token>`)
- Database migrated from SQLite to Supabase PostgreSQL
- `user_id` column added to `documents` and `chat_sessions` tables
- PDF fetching uses authenticated blob URLs (compatible with iframe viewer)
- OAuth callback route handles Google sign-in redirects
- Removed legacy SQLite migration code

### v0.9 -- AI Follow-up Suggestions (2026-03-04)
- After each AI response, 2-3 follow-up questions are generated based on actual PDF content
- Suggestions reference specific topics, names, and facts from the document
- Clickable suggestion buttons fill the input field for quick follow-up
- Uses the full RAG context (not truncated sources) for relevant suggestions
- Suggestions written in the same language as the user's question

### v0.8 -- Chat Session Management (2026-03-04)
- Conversations are now first-class entities with their own titles
- Right-click context menu on conversations: rename, pin/unpin, export, reset, delete
- Three-dots button (visible on hover) also opens the context menu
- Pinned conversations appear at the top of the sidebar
- "New chat" button to start a fresh conversation on the same document
- Export conversations as JSON files
- Multiple conversations per document supported
- New database table `chat_sessions` with title, pinned status, timestamps
- New database table `chat_messages` replacing the old `conversation_messages`
- Automatic migration of legacy conversations to the new format
- New API: GET/POST `/api/chats`, PATCH/DELETE `/api/chats/{id}`, reset, export, messages

### v0.7 -- PDF Storage in SQLite (2026-03-04)
- PDF files now stored as BLOBs directly in SQLite (no more `uploads/` folder)
- Automatic migration: existing files from `uploads/` imported into the database on startup
- Optimized document listing: `has_pdf` computed at SQL level without loading BLOBs
- PDF serving via `GET /api/documents/{id}/pdf` reads from database
- Re-attach PDF via `POST /api/documents/{id}/pdf` saves to database
- Single `chatpdf.db` file contains everything (metadata, conversations, PDFs)

### v0.6 -- Persistent Storage & Conversation History (2026-03-04)
- Added SQLite database via SQLAlchemy for persistent storage
- Document metadata now survives backend restarts (replaces in-memory dict)
- Conversation history saved per document (and per multi-document combination)
- Past conversations automatically restored when selecting a document
- "Clear conversation" button (trash icon) next to the chat input
- New API endpoints: GET/POST/DELETE `/api/conversations/{key}`
- New file: `backend/database.py` with `DocumentModel` and `ConversationMessage` tables
- Database auto-created at `backend/chatpdf.db` on first startup
- Ready for future migration to PostgreSQL (same SQLAlchemy models)

### v0.5 -- Multi-Document Querying (2026-03-04)
- Select multiple PDFs using checkboxes in the sidebar and query across all of them at once
- Cross-document comparison, synthesis, and summarization
- Pinecone filter uses `$in` operator to search across multiple document vectors simultaneously
- Sources now display the filename alongside the page number in multi-document mode
- "Select all / Deselect all" shortcut in the sidebar when multiple documents exist
- Dedicated multi-document suggestions in chat (compare, find commonalities, summarize each)
- Summary panel adapts prompts for cross-document summaries
- Backend API accepts `document_ids` (array) with backward compatibility for `document_id` (string)
- Fixed Pinecone SDK compatibility (handles both dict and object query responses)

### v0.4 -- Streaming Responses (2026-03-04)
- Added SSE (Server-Sent Events) streaming endpoint `/api/chat/stream`
- Chat responses now appear word-by-word in real-time like ChatGPT
- Backend uses LangChain's `astream()` for token-level streaming
- Frontend reads the SSE stream via `ReadableStream` and updates the UI progressively
- Bouncing dots show during retrieval, then text flows in live

### v0.3 -- PDF Preview Panel (2026-03-04)
- Added side-by-side PDF viewer next to the chat (50/50 split)
- "View PDF" / "Hide PDF" toggle button in the top bar
- PDF preview opens automatically after upload
- Uses browser's built-in PDF renderer (iframe), toolbar hidden
- Blob URLs created on upload and properly revoked on delete

### v0.2 -- UX Fixes (2026-03-04)
- Fixed chat scrolling: replaced shadcn ScrollArea with native `overflow-y-auto` + `scrollIntoView`
- Increased RAG context: `TOP_K` raised from 5 to 10 for more comprehensive answers
- Updated system prompt to encourage detailed answers and avoid refusing in-depth explanations
- Removed markdown formatting from AI responses (plain text only)
- Fixed backend lazy initialization so server starts even without API keys
- Fixed `.env.local` path resolution using `pathlib.Path` for reliable loading

### v0.1 -- Initial MVP (2026-03-04)
- PDF upload with drag & drop, progress bar, file validation (max 50MB)
- RAG pipeline: PDF text extraction (PyPDF2) -> chunking (LangChain) -> embedding (OpenAI) -> vector storage (Pinecone)
- Chat interface with ChatGPT-style message bubbles
- Source citations with expandable page references
- Document summary generation (full, key points, brief)
- Document management: list, select, delete
- Collapsible sidebar with document list
- Error handling with toast notifications

---

## Known Issues

- Pinecone query results parsing may need adjustment depending on SDK version (v6 returns dicts, v7 returns objects with attributes).
- Large files (>50MB) stored as BYTEA in PostgreSQL may increase database size significantly.
- `.doc` (legacy Word format) support requires the file to be a valid `.docx` internally; true `.doc` binary files are not supported.

## Planned Features

- ~~Persistent document storage (SQLite/PostgreSQL)~~ (done in v0.6)
- ~~Chat session management (rename, pin, delete, export)~~ (done in v0.8)
- ~~AI-powered follow-up suggestions~~ (done in v0.9)
- ~~User authentication~~ (done in v1.0)
- ~~Multi-document cross-querying~~ (done in v0.5)
- ~~Multi-format document support (Word, PowerPoint, TXT)~~ (done in v1.1)
- ~~AI content detector~~ (done in v1.2)
- ~~Interactive Quiz (QCM) generator~~ (done in v1.4)
- ~~Split-View for Quiz/Summary~~ (done in v1.5)
- ~~Dark mode toggle~~ (done in v2.1)
- ~~Landing page~~ (done in v3.0)
- ~~Guest mode with restrictions~~ (done in v3.0)
- ~~Auth pages redesign (Humata-style two-column)~~ (done in v3.1)
- ~~Immersive dashboard with video background & glassmorphism~~ (done in v4.0)
- ~~Full light/dark mode parity~~ (done in v4.0)
- ~~Premium light mode with full-bleed video & adaptive UI~~ (done in v5.0)
- ~~Landing page light mode support~~ (done in v5.0)
- Multi-language localization (FR/EN/AR) improvements
- OCR support for scanned PDFs
- Docker deployment setup
