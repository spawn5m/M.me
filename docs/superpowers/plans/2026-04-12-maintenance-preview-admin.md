# Maintenance Preview Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a session-scoped admin preview toggle that lets users with `maintenance.manage` browse the real public pages even while maintenance mode is active.

**Architecture:** Keep maintenance configuration authoritative in the backend and add a separate client-only preview flag in the frontend. `MaintenancePage` owns the toggle UI and writes the flag to `sessionStorage`; `PublicPageRoute` remains the single gate that combines maintenance state, auth permissions, and the preview flag to decide whether to show the maintenance screen or the real page.

**Tech Stack:** React 19, TypeScript, React Router, Vitest, React Testing Library, sessionStorage.

---

## File Map

- `frontend/src/lib/maintenance-preview.ts`
  - Small shared helper for the preview storage key plus read/write functions.
- `frontend/src/pages/admin/MaintenancePage.tsx`
  - Adds the global preview toggle UI and keeps it outside the existing maintenance form payload.
- `frontend/src/pages/admin/__tests__/MaintenancePage.test.tsx`
  - Covers sessionStorage initialization, toggle persistence, and the fact that preview does not dirty the save form.
- `frontend/src/components/layout/PublicPageRoute.tsx`
  - Applies the preview bypass only for users with `maintenance.manage`, while keeping normal public wrappers intact.
- `frontend/src/components/layout/__tests__/PublicPageRoute.test.tsx`
  - Covers bypass behavior for admin preview and the unchanged maintenance behavior for non-admin users.

---

### Task 1: Add the global preview toggle to the admin maintenance page

**Files:**
- Create: `frontend/src/lib/maintenance-preview.ts`
- Modify: `frontend/src/pages/admin/MaintenancePage.tsx`
- Test: `frontend/src/pages/admin/__tests__/MaintenancePage.test.tsx`

- [ ] **Step 1: Write the failing tests for the preview toggle**

Add these tests to `frontend/src/pages/admin/__tests__/MaintenancePage.test.tsx`:

```tsx
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
    mockFetchAdminMaintenance.mockResolvedValue(axiosResponse(SAMPLE))
    mockUpdateAdminMaintenance.mockResolvedValue(axiosResponse({ ok: true }))
    mockReloadResources.mockResolvedValue(undefined)
  })

  it('inizializza la preview globale dalla sessione senza sporcare il form', async () => {
    window.sessionStorage.setItem('admin-maintenance-preview-enabled', 'true')

    render(<MaintenancePage />)

    const previewToggle = await screen.findByRole('checkbox', { name: 'Preview manutenzione' })

    expect(previewToggle).toBeChecked()
    expect(screen.getByRole('button', { name: 'Salva modifiche' })).toBeDisabled()
    expect(screen.queryByText('Hai modifiche non salvate.')).toBeNull()
  })

  it('aggiorna la preview globale nella sessione', async () => {
    const user = userEvent.setup()

    render(<MaintenancePage />)

    const previewToggle = await screen.findByRole('checkbox', { name: 'Preview manutenzione' })

    expect(window.sessionStorage.getItem('admin-maintenance-preview-enabled')).toBeNull()

    await user.click(previewToggle)

    expect(window.sessionStorage.getItem('admin-maintenance-preview-enabled')).toBe('true')
    expect(screen.getByRole('button', { name: 'Salva modifiche' })).toBeDisabled()
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -w frontend -- frontend/src/pages/admin/__tests__/MaintenancePage.test.tsx
```

Expected: FAIL because the page does not yet render a checkbox with accessible name `Preview manutenzione`.

- [ ] **Step 3: Write the minimal implementation**

Create `frontend/src/lib/maintenance-preview.ts`:

```ts
export const MAINTENANCE_PREVIEW_STORAGE_KEY = 'admin-maintenance-preview-enabled'

export function readMaintenancePreviewEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return window.sessionStorage.getItem(MAINTENANCE_PREVIEW_STORAGE_KEY) === 'true'
}

export function writeMaintenancePreviewEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(MAINTENANCE_PREVIEW_STORAGE_KEY, String(enabled))
}
```

Update the imports and state in `frontend/src/pages/admin/MaintenancePage.tsx`:

```tsx
import { readMaintenancePreviewEnabled, writeMaintenancePreviewEnabled } from '../../lib/maintenance-preview'

export default function MaintenancePage() {
  const [previewEnabled, setPreviewEnabled] = useState(() => readMaintenancePreviewEnabled())
  const [initialState, setInitialState] = useState<AdminMaintenanceResponse | null>(null)
  const [formState, setFormState] = useState<AdminMaintenanceResponse | null>(null)
```

Add the toggle handler inside `MaintenancePage`:

```tsx
  function updatePreviewEnabled(enabled: boolean) {
    setPreviewEnabled(enabled)
    writeMaintenancePreviewEnabled(enabled)
  }
```

Render the new card between the page intro block and the per-page maintenance cards:

```tsx
      <div className="border border-[#E5E0D8] bg-white p-6 shadow-[0_2px_8px_rgba(26,43,74,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#6B7280]">
              Preview manutenzione
            </p>
            <p className="mt-2 text-sm text-[#6B7280]">
              Attiva la preview solo per questa sessione admin per vedere le pagine pubbliche reali durante la manutenzione.
            </p>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-3 self-start text-sm font-medium text-[#031634]">
            <input
              type="checkbox"
              checked={previewEnabled}
              onChange={(e) => updatePreviewEnabled(e.target.checked)}
              className="h-5 w-5 accent-[#C9A96E]"
            />
            Preview manutenzione
          </label>
        </div>
      </div>
```

Do not include `previewEnabled` in `initialState`, `formState`, `isDirty`, or `updateAdminMaintenance()`.

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npm test -w frontend -- frontend/src/pages/admin/__tests__/MaintenancePage.test.tsx
```

Expected: PASS for the new preview tests and the existing save test.

- [ ] **Step 5: Commit the maintenance-page-only change**

```bash
git add frontend/src/lib/maintenance-preview.ts frontend/src/pages/admin/MaintenancePage.tsx frontend/src/pages/admin/__tests__/MaintenancePage.test.tsx
git commit -m "feat: add admin maintenance preview toggle"
```

---

### Task 2: Bypass the maintenance screen when preview is active for admins

**Files:**
- Modify: `frontend/src/components/layout/PublicPageRoute.tsx`
- Test: `frontend/src/components/layout/__tests__/PublicPageRoute.test.tsx`

- [ ] **Step 1: Write the failing route-guard tests**

Replace the auth mock in `frontend/src/components/layout/__tests__/PublicPageRoute.test.tsx` so it can return different permission sets:

```tsx
vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
  getDefaultRoute: () => '/login',
}))
```

Then add the mocked import and default state:

```tsx
import { useAuth } from '../../../context/AuthContext'

const mockUseAuth = vi.mocked(useAuth)

beforeEach(() => {
  vi.clearAllMocks()
  window.sessionStorage.clear()
  mockUseAuth.mockReturnValue({ user: null, permissions: [] } as never)
})
```

Add these three tests:

```tsx
  it('bypasses the global home maintenance screen when preview is active for admins', () => {
    window.sessionStorage.setItem('admin-maintenance-preview-enabled', 'true')
    mockUseAuth.mockReturnValue({
      user: { id: '1' },
      permissions: ['maintenance.manage'],
    } as never)

    renderRoute('home', {
      home: { enabled: true },
      ourStory: { enabled: false },
      whereWeAre: { enabled: false },
      funeralHomes: { enabled: false },
      marmistas: { enabled: false },
    })

    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.queryByTestId('maintenance-screen')).toBeNull()
  })

  it('renders the real internal page with its normal chrome when preview is active for admins', () => {
    window.sessionStorage.setItem('admin-maintenance-preview-enabled', 'true')
    mockUseAuth.mockReturnValue({
      user: { id: '1' },
      permissions: ['maintenance.manage'],
    } as never)

    renderRoute('whereWeAre', {
      home: { enabled: false },
      ourStory: { enabled: false },
      whereWeAre: { enabled: true },
      funeralHomes: { enabled: false },
      marmistas: { enabled: false },
    })

    expect(screen.getByTestId('navbar-light')).toBeInTheDocument()
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByTestId('footer-light')).toBeInTheDocument()
    expect(screen.queryByTestId('maintenance-screen')).toBeNull()
  })

  it('keeps the maintenance screen for non-admin users even if preview is active', () => {
    window.sessionStorage.setItem('admin-maintenance-preview-enabled', 'true')

    renderRoute('whereWeAre', {
      home: { enabled: false },
      ourStory: { enabled: false },
      whereWeAre: { enabled: true },
      funeralHomes: { enabled: false },
      marmistas: { enabled: false },
    })

    expect(screen.getByTestId('maintenance-screen')).toHaveTextContent('Questa pagina è temporaneamente in manutenzione.')
    expect(screen.queryByTestId('child')).toBeNull()
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -w frontend -- frontend/src/components/layout/__tests__/PublicPageRoute.test.tsx
```

Expected: FAIL because `PublicPageRoute` still shows maintenance whenever the backend state is enabled.

- [ ] **Step 3: Write the minimal implementation**

Update `frontend/src/components/layout/PublicPageRoute.tsx` imports:

```tsx
import { useAuth } from '../../context/AuthContext'
import { readMaintenancePreviewEnabled } from '../../lib/maintenance-preview'
```

Inside `PublicPageRoute`, compute the bypass flag before the maintenance checks:

```tsx
  const { permissions } = useAuth()
  const previewEnabled = readMaintenancePreviewEnabled()
  const bypassMaintenance = previewEnabled && permissions.includes('maintenance.manage')
```

Gate the maintenance branches with `!bypassMaintenance`:

```tsx
  if (!bypassMaintenance && pages.home.enabled) {
    return (
      <PublicMaintenanceScreen
        variant="dark"
        message={t('maintenance.home')}
        showHeadline
        showReservedAreaButton
      />
    )
  }

  if (!bypassMaintenance && page !== 'home' && pages[page].enabled) {
    return (
      <>
        <Navbar variant="light" />
        <PublicMaintenanceScreen variant="light" message={t(`maintenance.${page}`)} />
        <FooterLight />
      </>
    )
  }
```

Do not add any new props to the public pages. The bypass should only make `PublicPageRoute` fall through to the existing normal render branches.

- [ ] **Step 4: Run targeted and full frontend verification**

Run:

```bash
npm test -w frontend -- frontend/src/components/layout/__tests__/PublicPageRoute.test.tsx
npm test -w frontend -- frontend/src/pages/admin/__tests__/MaintenancePage.test.tsx
npm test -w frontend
npm run build -w frontend
```

Expected:

- targeted route test: PASS
- targeted maintenance page test: PASS
- full frontend suite: PASS
- frontend build: PASS

- [ ] **Step 5: Commit the route-bypass change**

```bash
git add frontend/src/components/layout/PublicPageRoute.tsx frontend/src/components/layout/__tests__/PublicPageRoute.test.tsx
git commit -m "feat: allow admin preview during maintenance"
```

---

## Plan Review

- Spec coverage: covered the global toggle UI, session-only persistence, admin-only bypass, and tests for both UI and route-guard behavior.
- Placeholder scan: no TODO/TBD markers, no omitted commands, no vague testing steps.
- Type consistency: preview storage key is centralized in `frontend/src/lib/maintenance-preview.ts`; `PublicPageRoute` reads `permissions` from `useAuth` without changing existing route props.
