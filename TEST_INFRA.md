# E2E Test Infra: Amber Avenue Admin Panel Overhaul

## Test Philosophy
- **Opaque-Box & Requirement-Driven**: Validates `admin.html` strictly against user requirements in `ORIGINAL_REQUEST.md`, testing DOM outputs, event interactions, visual styling classes, and `localStorage` state transitions.
- **Methodology**: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Testing across 4 Tiers.

## Feature Inventory (33 Features)
| # | Feature | Requirement Source | Tier 1 (Min 5) | Tier 2 (Min 5) | Tier 3 (Pairwise) | Tier 4 (Scenario) |
|---|---------|-------------------|:--------------:|:--------------:|:-----------------:|:-----------------:|
| F-01 | Dashboard 3-Tier Layout | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F-02 | Top-3 KPI Summaries | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F-03 | Incoming Leads Tagged Feed | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F-04 | Paid Leads Visual Guard | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F-05 | Moderation Counter Widget | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F-06 | Developer Notifs & Expiry | ORIGINAL_REQUEST §R1, R5 | 5 | 5 | ✓ | ✓ |
| F-07 | Support Tickets Feed | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F-08 | Audit Change Logs Widget | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F-09 | Properties/Mod Menu Unification | ORIGINAL_REQUEST §R2, R8 | 5 | 5 | ✓ | ✓ |
| F-10 | ZHK Card Grid Architecture | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| F-11 | ZHK Card Action Buttons | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| F-12 | Two-Block Properties Layout | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| F-13 | 9-Section Accordion Remarks | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| F-14 | Developer Code Regeneration | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F-15 | Copy Access Code Modal | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F-16 | Auto-Calculated Dev Rating | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F-17 | Telegraph-Style Full Editor | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |
| F-18 | Floating Formatting Toolbar | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |
| F-19 | Telegraph Block Elements | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |
| F-20 | Blog Action Controls | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |
| F-21 | Payment Status Stepper | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ | ✓ |
| F-22 | Expanded Placements Comments | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ | ✓ |
| F-23 | 3-Step Ad Booking Flow | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ | ✓ |
| F-24 | 1-Day Expiry Notification Hub | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ | ✓ |
| F-25 | Unified Leads Menu & Section | ORIGINAL_REQUEST §R6, R8 | 5 | 5 | ✓ | ✓ |
| F-26 | Collapsible Leads Info Banner | ORIGINAL_REQUEST §R6 | 5 | 5 | ✓ | ✓ |
| F-27 | Leads 3-Way Filter Tabs | ORIGINAL_REQUEST §R6 | 5 | 5 | ✓ | ✓ |
| F-28 | Leads Paid Visual Guard & Tags | ORIGINAL_REQUEST §R6 | 5 | 5 | ✓ | ✓ |
| F-29 | Leads CSV & 152-FZ Passport | ORIGINAL_REQUEST §R6 | 5 | 5 | ✓ | ✓ |
| F-30 | 8-Block Statistics Dashboard | ORIGINAL_REQUEST §R7 | 5 | 5 | ✓ | ✓ |
| F-31 | Yandex Metrika Storage & UI | ORIGINAL_REQUEST §R7 | 5 | 5 | ✓ | ✓ |
| F-32 | Navigation & Sidebar Reorg | ORIGINAL_REQUEST §R8 | 5 | 5 | ✓ | ✓ |
| F-33 | Backgrounds Controls Verified | ORIGINAL_REQUEST §R8 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Test Runner Location**: `tests/e2e/run_all_tests.js` (executable via `node tests/e2e/run_all_tests.js`).
- **Test Framework**: Automated DOM & integration testing utilizing Node.js with a dedicated lightweight JSDOM/DOM simulation environment and headless browser verification.
- **Pass/Fail Semantics**: All test cases across Tiers 1-4 must complete with exit code 0 and 0 assertion failures.
- **Directory Layout**:
  - `tests/e2e/test_runner.js`: Central test runner with reporting.
  - `tests/e2e/tier1_feature_coverage.test.js`: Tier 1 isolation tests (5+ per feature, ~165+ tests).
  - `tests/e2e/tier2_boundary_corner.test.js`: Tier 2 boundary and corner case tests (5+ per feature, ~165+ tests).
  - `tests/e2e/tier3_pairwise.test.js`: Tier 3 cross-feature combinatorial tests (33+ pairwise tests).
  - `tests/e2e/tier4_real_world.test.js`: Tier 4 end-to-end user workflows (17+ realistic workflow scenarios).

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Superadmin Daily Review | F-01, F-02, F-03, F-05, F-06, F-07, F-08 | High |
| 2 | ZHK Moderation & Developer Correction Workflow | F-05, F-09, F-10, F-11, F-12, F-13 | High |
| 3 | Developer Access Token Refresh & Rating Audit | F-14, F-15, F-16 | Medium |
| 4 | Telegraph Blog Authoring, Formatting & Publishing | F-17, F-18, F-19, F-20 | High |
| 5 | Ad Placement Booking, Stepper Updates & 1-Day Alert | F-06, F-21, F-22, F-23, F-24 | High |
| 6 | Leads Ingestion, Filtering, Locking & CSV Export | F-03, F-04, F-25, F-26, F-27, F-28, F-29 | High |
| 7 | Portal Analytics Exploration & Yandex Metrika Setup | F-02, F-30, F-31 | Medium |
| 8 | Complete Sidebar Navigation & Page Backgrounds Customization | F-09, F-25, F-32, F-33 | Medium |

## Coverage Thresholds
- **Tier 1**: $\ge 165$ test cases (5 per feature $\times 33$).
- **Tier 2**: $\ge 165$ test cases (5 per feature $\times 33$).
- **Tier 3**: $\ge 33$ test cases (major pairwise interactions).
- **Tier 4**: $\ge 17$ test cases (end-to-end multi-step application scenarios).
- **Total Suite**: $\ge 380$ automated test assertions.
