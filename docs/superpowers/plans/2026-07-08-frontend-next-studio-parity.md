# Frontend Next Studio Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `frontend-next` studio match the old Web studio's PC three-column workspace and mobile feature-drawer/canvas/settings flow without copying legacy CSS or adding override layers.

**Architecture:** Keep one `StudioPage` state owner and one responsive DOM tree. Extract the canvas and settings presentation into focused components, turn the feature panel into an off-canvas drawer only below 768px, and rewrite the page stylesheet as one authoritative rule set built from existing tokens.

**Tech Stack:** React 19, TypeScript, Vite, CSS Grid/Flex, Node test runner, in-app Browser QA.

---

### Task 1: Add studio structure and style-boundary contracts

**Files:**
- Create: `frontend-next/src/pages/studio/StudioPage.contract.test.mjs`

- [ ] **Step 1: Write the failing contract tests**

```js
test('studio exposes one responsive feature drawer and mobile settings flow', () => {
  assert.match(source, /featureDrawerOpen/);
  assert.match(source, /aria-controls="studio-feature-panel"/);
  assert.match(source, /studioDrawerBackdrop/);
  assert.match(css, /@media \(max-width: 767px\)/);
});

test('studio css has one clean authority', () => {
  assert.doesNotMatch(css, /!important|\.topApp|\.wb[A-Z]|#[0-9a-f]{3,8}/i);
  assert.deepEqual(duplicateRuleHeaders(css), []);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test frontend-next/src/pages/studio/StudioPage.contract.test.mjs`

Expected: FAIL because the feature drawer contract is absent and the current stylesheet has not been replaced.

### Task 2: Build the single responsive studio component tree

**Files:**
- Create: `frontend-next/src/pages/studio/StudioCanvasPanel.tsx`
- Create: `frontend-next/src/pages/studio/StudioSettingsPanel.tsx`
- Modify: `frontend-next/src/pages/studio/StudioPage.tsx`

- [ ] **Step 1: Extract the canvas panel**

Move only the signal bar, mobile feature trigger, upload canvas, message, and recent-task presentation into `StudioCanvasPanel`. Pass state and callbacks as typed props; keep API calls and state mutation in `StudioPage`.

- [ ] **Step 2: Extract the settings panel**

Move prompt, reference upload, output controls, generate button, and quota summary into `StudioSettingsPanel`. Reuse the same component for PC and mobile.

- [ ] **Step 3: Add feature drawer state and accessible controls**

```tsx
const [featureDrawerOpen, setFeatureDrawerOpen] = useState(false);

<button
  type="button"
  className="studioMobileFeatureButton"
  aria-controls="studio-feature-panel"
  aria-expanded={featureDrawerOpen}
  onClick={() => setFeatureDrawerOpen(true)}
>
  功能与资源
</button>
```

Add one backdrop and one close button. Close the drawer after choosing a feature on mobile while retaining the selected state.

- [ ] **Step 4: Run type checking**

Run: `npm --prefix frontend-next run typecheck`

Expected: PASS with no TypeScript errors.

### Task 3: Replace the studio stylesheet with one authoritative responsive layout

**Files:**
- Modify: `frontend-next/src/pages/studio/StudioPage.css`

- [ ] **Step 1: Implement the PC workspace**

Use a full-width, viewport-height grid with `var(--studio-left-width) minmax(0, 1fr) var(--studio-right-width)`, zero inter-panel gap, flat panel boundaries, and independent panel scrolling.

- [ ] **Step 2: Implement the mobile flow**

At `max-width: 767px`, make the center panel first, move settings below it, and position the feature panel as a left drawer controlled by `isFeatureOpen`. Keep the global bottom navigation clear with safe-area padding.

- [ ] **Step 3: Remove dead and duplicate rules**

Delete selectors no longer present in the resulting TSX, remove repeated property declarations, and retain no `!important`, legacy selector, or page-local real color.

- [ ] **Step 4: Verify GREEN**

Run: `node --test frontend-next/src/pages/studio/StudioPage.contract.test.mjs`

Expected: PASS for responsive structure, selector uniqueness, and style-boundary checks.

### Task 4: Verify behavior and visual parity

**Files:**
- Modify only if validation finds a concrete mismatch: `frontend-next/src/pages/studio/StudioPage.tsx`, `StudioCanvasPanel.tsx`, `StudioSettingsPanel.tsx`, `StudioPage.css`

- [ ] **Step 1: Run automated verification**

Run: `node --test frontend-next/src/pages/studio/StudioPage.contract.test.mjs`

Run: `npm --prefix frontend-next run typecheck`

Run: `npm --prefix frontend-next run build`

Expected: all commands PASS.

- [ ] **Step 2: Verify PC and tablet rendering**

Open `/studio` at 1440×900 and 1024×768. Confirm three columns remain visible, the canvas owns the largest width, panels scroll independently, and there is no horizontal page overflow.

- [ ] **Step 3: Verify mobile rendering and interaction**

Open `/studio` at 390×844. Confirm the canvas is first, click `功能与资源`, verify the drawer and backdrop, switch to `场景融合`, close the drawer, change resolution, and confirm the settings section remains above the global bottom navigation.

- [ ] **Step 4: Check browser health and capture evidence**

Confirm page identity, meaningful DOM, no framework overlay, no relevant console errors, and capture final PC/mobile screenshots for handoff.
