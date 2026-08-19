# CPA-V2 E2E Live Runtime Test Suite

live_runtime_suite.py executes all 28 test categories from docs/CPA_V2_Test_Plan.md against the actual running app.

## Run
```bash
cd <project-root>
python tests/e2e/live_runtime_suite.py
```

## Prerequisites
- All 7 Docker services running
- test_documents/ folder with PDFs
- openpyxl installed: pip install openpyxl

## Last Run (2026-08-19)
- Total: 210 tests | Passed: 161 (77%) | Failed: 34 (16%) | Gaps: 15 (7%)
- Results written to docs/CPA_V2_Test_Execution_Tracker.xlsx (Live Runtime Results sheet)
