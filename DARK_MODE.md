# Dark mode — what's wired and what's left

## TL;DR

Infrastructure is in place. The **chrome** (body, nav, logo) responds to
the toggle. **Page bodies** still need `dark:` variants applied per
component — there are hundreds of them, and adding `dark:` everywhere
in one commit would be a multi-day effort. Treat this as a foundation
that you can extend incrementally.

## What works today

| Surface | Dark mode |
|---|---|
| `<html>` `dark` class | ✅ Toggled via `<ThemeProvider>` |
| Body background + text | ✅ `dark:bg-slate-950 dark:text-slate-100` |
| Navbar background + border | ✅ |
| Logo (auto-swap light↔dark SVG) | ✅ |
| Theme toggle button in navbar | ✅ |
| Footer (already dark by design) | ✅ Looks correct in both themes |
| Persistent preference (localStorage) | ✅ |
| Respects OS `prefers-color-scheme` on first load | ✅ |
| No-flash on initial paint | ✅ Inline script in `<head>` |
| Admin panel (`/admin/*`) | ⏭️ Intentionally untouched — has its own slate→indigo→violet chrome |

## What's NOT covered yet

Every page in `/app/**/page.tsx` styles its content with light-mode-only
classes. In dark mode the chrome flips but the page bodies stay light
(white cards, dark text on light backgrounds). To fix these you need to
add `dark:` variants to each component.

### Pattern for adding `dark:` to existing pages

For each Tailwind class that defines a color, add the matching `dark:`
variant:

| Light | Dark |
|---|---|
| `bg-white` | `dark:bg-slate-900` |
| `bg-gray-50` | `dark:bg-slate-900` |
| `bg-gray-100` | `dark:bg-slate-800` |
| `text-gray-900` / `text-slate-900` | `dark:text-slate-100` |
| `text-gray-700` | `dark:text-slate-300` |
| `text-gray-500` | `dark:text-slate-400` |
| `border-gray-200` | `dark:border-slate-800` |
| `border-slate-200` | `dark:border-slate-800` |
| `shadow-sm` etc. | usually fine (shadows show on dark too) |

### Highest-leverage pages to dark-mode next

Ranked by user-facing surface area:

1. **`app/page.tsx`** — homepage hero / sections
2. **`app/auth/login/page.tsx`** — login screen
3. **`app/auth/register/page.tsx`** — signup
4. **`app/dashboard/**`** — patient dashboard (hundreds of components)
5. **`app/blog/**`** — blog (BlogClient + post pages)
6. **`app/doctors/**`** — doctor listings
7. **`app/consult/**`** — consultation booking
8. **`app/features/page.tsx`**

Estimate: roughly 1 hour per page section for a thorough sweep, faster
once you have the pattern. Use grep + multi-cursor in VS Code:

```bash
grep -rn "bg-white\|text-gray-9\|border-slate-2" app/auth/login/
```

Then for each match: add the `dark:` sibling.

## How to use what's shipped

### Logo component — drop-in everywhere

```tsx
import Logo from "@/components/Logo";

// Auto-swap based on current theme (default)
<Logo size="sm" />

// Force light variant (use inside an always-dark hero)
<Logo size="lg" variant="light" />

// Force dark variant (use inside an always-white card)
<Logo size="md" variant="dark" />
```

### Theme toggle — already in navbar

Drop the same button anywhere else if you want a second control:

```tsx
import ThemeToggle from "@/components/ThemeToggle";
<ThemeToggle />
```

### Read theme programmatically

```tsx
import { useTheme } from "@/components/ThemeProvider";
const { theme, toggle, setTheme } = useTheme();
```

### Force a specific theme from code

```tsx
setTheme("dark"); // or "light"
```

## Risk / known limitations

- **Browser extensions** that inject styles (Dark Reader etc.) may
  double-up — our dark mode + their theme = unreadable. Document this
  for support. We can detect Dark Reader and short-circuit our theme
  if it becomes a real support burden.
- **Old logo files** at `/images/logo.svg` and `/images/logo-full.png`
  are still in `public/images/`. Not used by the Logo component anymore.
  Leave them in case third-party embeds or social-share preview cards
  reference them; remove in a separate cleanup commit.
- **Inline `<img>` references** in pages that bypass the `<Logo>`
  component won't swap. Search for `logo.svg` / `logo-full.png` and
  migrate those to `<Logo>` to get the auto-swap.
- **Email templates** rendered to HTML in `lib/email.ts` use hardcoded
  light-mode colors. Most email clients ignore prefers-color-scheme
  anyway, so this is usually fine — but you could add a `@media
  (prefers-color-scheme: dark)` block if you want.
- **PDF rendering** (invoices, reports) is always light. PDFs don't
  have a "dark mode" concept; black ink on white paper is the assumption.
  Leave alone.

## File reference

| File | Role |
|---|---|
| `components/ThemeProvider.tsx` | Context + `NO_FLASH_SCRIPT` constant |
| `components/ThemeToggle.tsx` | Sun/moon toggle button |
| `components/Logo.tsx` | Theme-aware logo with auto/light/dark variants |
| `public/images/logo-light.svg` | Dark text on white — for light mode |
| `public/images/logo-dark.svg` | White text on transparent — for dark mode |
| `tailwind.config.ts` | `darkMode: "class"` enabled |
| `app/layout.tsx` | NO_FLASH_SCRIPT in `<head>`, ThemeProvider wrap, body dark variants |
| `components/Navbar.tsx` | Dark variants on the nav bar + ThemeToggle button |
