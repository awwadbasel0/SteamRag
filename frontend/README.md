# SteamRAG Cloud Server — Frontend (`frontend/`) 🎨☁️

React 19 + TypeScript + Vite 8 + Tailwind CSS v4 frontend for **SteamRAG Cloud Server Edition**.

---

## 🧩 Core Components

- **[`src/App.tsx`](src/App.tsx)**:
  - Main chat workspace with paced line-by-line streaming (`75ms` buffer queue) for smooth readability.
  - Floating **Jump to bottom** button (`fixed bottom-24`) that appears whenever you scroll up (`>60px`) or while a response is actively streaming.
  - Frosted glassmorphic chat bubbles (`backdrop-blur-xl`) layered over the dynamic game background.
- **[`src/components/DynamicGameBackdrop.tsx`](src/components/DynamicGameBackdrop.tsx)**:
  - Multi-effect dynamic background engine driven by your synced Steam library, newly discovered games in the active chat, or iconic fallback titles when logged out.
  - Combines a full-bleed **Ken Burns cross-fading slideshow** (`2.4s` fade), **4 staggered floating parallax art frames** in the left/right margins, **ambient color mood lighting**, **rising glowing embers**, and a bottom-left slideshow controller pill.
- **[`src/components/RankedGameDiscovery.tsx`](src/components/RankedGameDiscovery.tsx)**:
  - Clearly collapsible **Discovered Matches** container (`Collapse Matches ▲` / `Expand N Matches ▼`) with a compact thumbnail strip when collapsed.
  - Interactive sorting (*Best Match*, *Most Played Now*, *Top Rated*, *Shortest/Longest Game*, *Most Reviewed*) and toggle between **Cards View** and **Comparison Table View**.
- **[`src/components/MarkdownRenderer.tsx`](src/components/MarkdownRenderer.tsx)**:
  - Flicker-free memoized block Markdown renderer (`React.memo` + module-scoped `markdownComponents`), LaTeX symbol sanitizer (`$\rightarrow$` → `→`), and interactive **Suggested Follow-Up Questions** buttons (`<<<FOLLOW_UPS>>>`).
- **[`src/components/Navbar.tsx`](src/components/Navbar.tsx)**:
  - Cloud Server header featuring the **Google Gemini Cloud model selector** (showing live canary latency badges), **Connect Gemini / Settings** trigger, and **Sign In with Steam** profile menu.
- **[`src/components/SettingsModal.tsx`](src/components/SettingsModal.tsx)**:
  - Configure a **Google AI Studio API Key**, **Google OAuth 2.0 Web Client**, **Steam Web API Key**, or **SteamDB Cookie**.

---

## 🛠️ Scripts

```bash
# Install dependencies
npm install

# Start Vite development server (http://localhost:5173, proxies /api to :8000)
npm run dev -- --host

# Build production bundle into dist/ (automatically served by FastAPI on :8000)
npm run build
```
