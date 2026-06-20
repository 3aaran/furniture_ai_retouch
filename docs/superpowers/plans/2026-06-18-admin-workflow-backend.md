# Admin Workflow Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace browser-local workflow persistence with a simple MySQL-backed administrator API.

**Architecture:** Store only the current workflow in one MySQL table. Keep validation in a focused backend domain module, expose authenticated administrator routes, and replace the frontend repository implementation without changing page component method calls.

**Tech Stack:** Node.js, Express, MySQL 8, React, Vite, Node test runner

---

### Task 1: Backend workflow domain

**Files:**
- Create: `backend/src/workflows/workflowDomain.js`
- Test: `backend/src/workflows/workflowDomain.test.mjs`

- [ ] Write failing tests for normalization, validation, row mapping, duplicate-code handling, and two example workflow payloads.
- [ ] Run `node --test src/workflows/workflowDomain.test.mjs` and confirm failure because the module does not exist.
- [ ] Implement pure workflow helpers with no database dependency.
- [ ] Re-run the test and confirm it passes.

### Task 2: MySQL schema and one-time seed

**Files:**
- Modify: `backend/src/db.js`
- Test: `backend/src/workflows/workflowSchema.test.mjs`

- [ ] Write a failing static contract test for `workflow_templates`, JSON columns, unique code, indexes, and the one-time seed marker.
- [ ] Run the test and confirm failure.
- [ ] Add table creation and one-time insertion of two deletable examples.
- [ ] Re-run the test and confirm it passes.

### Task 3: Workflow service and administrator routes

**Files:**
- Create: `backend/src/workflows/workflowService.js`
- Create: `backend/src/routes/workflowRoutes.js`
- Modify: `backend/src/server.js`
- Test: `backend/src/workflows/workflowService.test.mjs`
- Test: `backend/src/workflows/workflowRoutes.test.mjs`

- [ ] Write failing service tests using a small fake database adapter.
- [ ] Implement list, create, get, update, validate, publish, disable, duplicate, and delete.
- [ ] Write a failing route contract test for all paths and administrator middleware.
- [ ] Register the routes in `server.js`.
- [ ] Run both test files and confirm they pass.

### Task 4: Frontend API repository

**Files:**
- Modify: `frontend/src/admin/workflows/workflowRepository.js`
- Modify: `frontend/src/admin/workflows/WorkflowListPage.jsx`
- Modify: `frontend/src/admin/workflows/WorkflowEditorPage.jsx`
- Test: `frontend/src/admin/workflows/workflowRepository.test.mjs`
- Test: `frontend/src/admin/workflows/workflowUiContract.test.mjs`

- [ ] Replace local-storage tests with failing API request contract tests.
- [ ] Implement repository methods with the existing `req` and `qs` helpers.
- [ ] Remove local-data messaging and stop writing user IDs from the browser.
- [ ] Run all workflow frontend tests and confirm they pass.

### Task 5: Documentation and end-to-end verification

**Files:**
- Modify: `docs/project-overview.md`
- Modify: `README.md`

- [ ] Document the table, routes, authorization, example seed behavior, and absence of history versions.
- [ ] Run backend workflow tests.
- [ ] Run frontend workflow tests.
- [ ] Run the frontend production build.
- [ ] Restart the local backend if needed and verify list, create, edit, validate, publish, disable, duplicate, and delete in the browser.
