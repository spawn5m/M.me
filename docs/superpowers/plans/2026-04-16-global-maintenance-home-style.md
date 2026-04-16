# Global Maintenance Home-Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the global public maintenance screen so it matches the Home page visual language, uses localized Italian copy, and shows `Area Riservata` plus `Contattaci` mail CTA.

**Architecture:** Keep the existing routing flow unchanged and concentrate the behavior change inside the dark variant of `PublicMaintenanceScreen`. Extend the existing test coverage first, then add the new CTA and localized copy with minimal component changes. Leave the light maintenance variant for individual internal pages untouched.

**Tech Stack:** React 19, TypeScript, React Router, react-i18next, Vitest, Testing Library

---

## File Structure

- Modify: `frontend/src/components/layout/PublicMaintenanceScreen.tsx`
  Purpose: render the updated dark maintenance UI and the new `Contattaci` mail CTA.
- Modify: `frontend/src/locales/it.json`
  Purpose: store the new global maintenance copy and CTA label in the shared locale file.
- Create: `frontend/src/components/layout/__tests__/PublicMaintenanceScreen.test.tsx`
  Purpose: lock the dark-variant behavior with failing-first tests for localized copy, reserved-area CTA, and mail CTA.

---

### Task 1: Add dark maintenance screen tests first

**Files:**
- Create: `frontend/src/components/layout/__tests__/PublicMaintenanceScreen.test.tsx`
- Modify: `frontend/src/components/layout/PublicMaintenanceScreen.tsx`
- Modify: `frontend/src/locales/it.json`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PublicMaintenanceScreen from '../PublicMaintenanceScreen'

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: null, permissions: [] }),
  getDefaultRoute: () => '/login',
}))

vi.mock('../../../context/BrandingContext', () => ({
  useBranding: () => ({ logoUrl: null }),
}))

describe('PublicMaintenanceScreen', () => {
  it('renders the dark global maintenance screen with reserved area and contact mail actions', () => {
    render(
      <MemoryRouter>
        <PublicMaintenanceScreen
          variant="dark"
          message="Stiamo lavorando per migliorare il sito. Torneremo presto con grandi novita'."
          showHeadline
          showReservedAreaButton
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'MIRIGLIANI' })).toBeInTheDocument()
    expect(screen.getByText("Stiamo lavorando per migliorare il sito. Torneremo presto con grandi novita'.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Area Riservata' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Contattaci' })).toHaveAttribute('href', 'mailto:info@mirigliani.me')
  })

  it('keeps the light maintenance variant free of the global CTAs', () => {
    render(
      <MemoryRouter>
        <PublicMaintenanceScreen
          variant="light"
          message="Questa pagina e' temporaneamente in manutenzione."
        />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('link', { name: 'Area Riservata' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Contattaci' })).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- PublicMaintenanceScreen`
Expected: FAIL because `Contattaci` link does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```tsx
{showReservedAreaButton && (
  <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
    <Link
      to={reservedAreaHref}
      className="inline-flex min-h-11 items-center justify-center border border-[#C9A96E] px-8 py-3 font-['Inter'] text-sm font-medium uppercase tracking-[0.15em] text-[#C9A96E] transition-colors hover:bg-[#C9A96E]/10"
    >
      {t('nav.reservedArea')}
    </Link>
    <a
      href="mailto:info@mirigliani.me"
      className="inline-flex min-h-11 items-center justify-center border border-white px-8 py-3 font-['Inter'] text-sm font-medium uppercase tracking-[0.15em] text-white transition-colors hover:bg-white/10"
    >
      {t('common.contactUs')}
    </a>
  </div>
)}
```

```json
{
  "common": {
    "contactUs": "Contattaci"
  },
  "maintenance": {
    "home": "Stiamo lavorando per migliorare il sito. Torneremo presto con grandi novita'."
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- PublicMaintenanceScreen`
Expected: PASS with 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/__tests__/PublicMaintenanceScreen.test.tsx frontend/src/components/layout/PublicMaintenanceScreen.tsx frontend/src/locales/it.json
git commit -m "feat: refresh global maintenance screen"
```

---

### Task 2: Verify integration with existing public route behavior

**Files:**
- Modify: `frontend/src/components/layout/__tests__/PublicPageRoute.test.tsx`

- [ ] **Step 1: Write the failing integration test update**

```tsx
vi.mock('../PublicMaintenanceScreen', () => ({
  default: ({ variant, message, showReservedAreaButton }: { variant: string; message: string; showReservedAreaButton?: boolean }) => (
    <div data-testid="maintenance-screen" data-variant={variant} data-reserved={String(Boolean(showReservedAreaButton))}>
      {message}
    </div>
  ),
}))

it('passes the updated localized home maintenance message when global maintenance is active', () => {
  renderRoute('home', {
    home: { enabled: true },
    ourStory: { enabled: false },
    whereWeAre: { enabled: false },
    funeralHomes: { enabled: false },
    marmistas: { enabled: false },
  })

  expect(screen.getByTestId('maintenance-screen')).toHaveTextContent(
    "Stiamo lavorando per migliorare il sito. Torneremo presto con grandi novita'.",
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- PublicPageRoute`
Expected: FAIL because the previous `maintenance.home` text is still returned from locales.

- [ ] **Step 3: Keep the implementation minimal**

```json
{
  "maintenance": {
    "home": "Stiamo lavorando per migliorare il sito. Torneremo presto con grandi novita'."
  }
}
```

No routing change is needed; the route already reads `t('maintenance.home')`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- PublicPageRoute`
Expected: PASS and existing preview-related assertions remain green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/__tests__/PublicPageRoute.test.tsx frontend/src/locales/it.json
git commit -m "test: cover global maintenance home copy"
```

---

### Task 3: Final verification

**Files:**
- Modify: none
- Test: `frontend/src/components/layout/__tests__/PublicMaintenanceScreen.test.tsx`
- Test: `frontend/src/components/layout/__tests__/PublicPageRoute.test.tsx`

- [ ] **Step 1: Run focused tests**

```bash
npm run test -- PublicMaintenanceScreen PublicPageRoute
```

Expected: PASS with no failures.

- [ ] **Step 2: Run the frontend test suite if the focused tests are clean**

```bash
npm run test -- --run
```

Expected: PASS, or only unrelated pre-existing failures if already present before this change.

- [ ] **Step 3: Manually verify the UI in maintenance mode**

```bash
npm run dev
```

Open the public Home route with global maintenance enabled and verify:
- dark editorial background;
- localized message;
- `Area Riservata` link;
- `Contattaci` mail link;
- light maintenance pages unchanged.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/PublicMaintenanceScreen.tsx frontend/src/components/layout/__tests__/PublicMaintenanceScreen.test.tsx frontend/src/components/layout/__tests__/PublicPageRoute.test.tsx frontend/src/locales/it.json
git commit -m "feat: polish global maintenance experience"
```
