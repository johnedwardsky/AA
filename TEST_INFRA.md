# E2E Test Infra: Amber Avenue Platform Modernization

## Test Philosophy
- Opaque-box, requirement-driven testing executing in isolated `dom-sandbox.js` environments.
- Zero-regression requirement: all existing 115 test cases must pass without error.
- Comprehensive coverage across all requirements (R1–R6) using 4-tier systematic methodology:
  1. Tier 1: Feature Coverage (≥5 tests per feature)
  2. Tier 2: Boundary & Corner Cases (≥5 tests per feature)
  3. Tier 3: Cross-Feature Interactions (pairwise combinations)
  4. Tier 4: Real-World User/Admin Scenarios
  5. Tier 5: White-Box Adversarial Hardening

## Feature Inventory & Test Mapping
| # | Feature | Requirement | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|-------------|:------:|:------:|:------:|:------:|
| 1 | Citizen Requests Complete Removal | R1 | 5 | 5 | ✓ | ✓ |
| 2 | 6-Group Admin Sidebar Navigation | R6 | 5 | 5 | ✓ | ✓ |
| 3 | Developer Selector & 8 Placement Blocks | R2.1, R2.2 | 8 | 5 | ✓ | ✓ |
| 4 | Visual Booking Calendar & Color Coding | R2.3 | 5 | 5 | ✓ | ✓ |
| 5 | Placement Constraints & Pricing Engine | R2.4, R2.5 | 8 | 8 | ✓ | ✓ |
| 6 | Granular Analytics Tracking & Storage | R3.1, R3.2 | 5 | 5 | ✓ | ✓ |
| 7 | Tab Heatmap & CTA Metrics | R3.3, R3.4 | 5 | 5 | ✓ | ✓ |
| 8 | Developer Summary Table & Seed Data | R3.5 | 5 | 5 | ✓ | ✓ |
| 9 | Cabinet Analytics Gating (5+ Paid Cards) | R4.1 | 5 | 5 | ✓ | ✓ |
| 10 | Cabinet Active Placements & Request Modal | R4.2 | 5 | 5 | ✓ | ✓ |
| 11 | Cabinet Paid/Unpaid Badges & Warnings | R4.3 | 5 | 5 | ✓ | ✓ |
| 12 | Catalog Location Tab Map Gating | R5.1 | 5 | 5 | ✓ | ✓ |
| 13 | Leads CRM Routing (Developer vs Admin) | R5.2 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Master Test Runner**: `node tests/run-all.js`
- **DOM Execution Sandbox**: `tests/harness/dom-sandbox.js` (DOM elements, event listeners, localStorage mock, Web Crypto SHA-256 mock, 2D Canvas mock, script loader).
- **Test Suites**:
  - `tests/tier1-feature-coverage.test.js`: Feature verification across Admin, Cabinet, Catalog, Placements, Analytics.
  - `tests/tier2-boundary-corner.test.js`: Edge cases (empty data, invalid dates, max card limits, negative cooldowns, malformed storage).
  - `tests/tier3-cross-feature.test.js`: Multi-module integrations (Placement booked in Admin → Gating unlocked in Cabinet → Maps rendered in Catalog → Leads routed to Developer).
  - `tests/tier4-application-scenarios.test.js`: End-to-end admin workflows, developer onboarding, advertising campaigns.
  - `tests/tier5-adversarial-hardening.test.js`: Adversarial white-box tests, memory leak checks, prototype pollution resistance, DOM manipulation stability.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Super-Admin manages placements for multiple developers, books conflicting dates and verifies validation | R2, R6 | High |
| 2 | Developer logs into cabinet with 0 paid cards, views locked analytics, requests 5 paid cards in placements | R4, R2 | High |
| 3 | Admin approves 5 paid cards, developer cabinet instantly unlocks full analytics suite with charts | R2, R3, R4 | High |
| 4 | End-user submits availability request on unpaid card, lead routes to Admin Platform Leads | R5, R1, R6 | Medium |
| 5 | End-user submits availability request on paid card, lead routes to Developer CRM with active map buttons | R5, R4, R3 | Medium |

## Coverage Thresholds
- Minimum Test Count: ≥115 regression tests + ≥65 new tests = ≥180 total tests.
- 0 Console Errors across all 18 admin sections and 18 cabinet tabs.
