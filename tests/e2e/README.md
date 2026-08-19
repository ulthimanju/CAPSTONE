# CPA-V2 Modular Live Test Suite

## Overview
This directory contains the modular, category-by-category live runtime test suite for **CPA-V2**.
It tests all 28 categories from docs/CPA_V2_Test_Plan.md plus multi-format document ingestion (.pdf, .docx, .pptx, .csv, .xlsx, .png, .jpg).

## Architecture
`
tests/
├── conftest.py                   # Pytest fixtures (client, dynamic accounts, workspaces)
├── config.py                     # URLs, service ports, test document paths
├── runner.py                     # CLI Test Runner + Excel Exporter
├── core/
│   ├── client.py                 # Reusable ApiClient with auth, retries, multipart upload
│   └── reporter.py               # Excel Results Exporter & Summary Calculator
└── e2e/                          # Modular Category Suites (1 to 28)
    ├── test_01_unit_gaps.py
    ├── test_02_oauth.py
    ├── test_03_cross_service.py
    ├── test_04_api_e2e.py
    ├── test_05_doc_pipeline.py
    ├── test_06_security.py
    ├── test_07_performance.py
    ├── test_08_ui_ux.py
    ├── test_09_edge_cases.py
    ├── test_10_known_gaps.py
    ├── test_11_collaboration.py
    ├── test_12_quiz_units.py
    ├── test_13_learning_path.py
    ├── test_14_chat_history.py
    ├── test_15_google_drive.py
    ├── test_16_doc_phases.py
    ├── test_17_aggregation.py
    ├── test_18_health.py
    ├── test_19_pagination.py
    ├── test_20_notifications.py
    ├── test_21_config_startup.py
    ├── test_22_rate_limiting.py
    ├── test_23_mutation.py
    ├── test_24_contracts.py
    ├── test_25_db_integrity.py
    ├── test_26_disaster_recovery.py
    ├── test_27_accessibility.py
    ├── test_28_frontend_resilience.py
    └── test_document_ingestion.py
`

## Running Tests

### 1. Run All Categories & Ingest All Files
`ash
python tests/runner.py
`

### 2. Run a Specific Category
`ash
python tests/runner.py --cat 6     # Security Tests
python tests/runner.py --cat 11    # Collaboration & Invitations
python tests/runner.py --cat 18    # Health & Observability
`

### 3. Run Document Ingestion Only (All 7 Folders)
`ash
python tests/runner.py --ingest
`

### 4. Run Directly with Pytest
`ash
pytest tests/e2e/test_06_security.py -v
pytest tests/e2e/ -k "oauth"
`

## Results Export
Every run updates the **"Live Runtime Results"** sheet in docs/CPA_V2_Test_Execution_Tracker.xlsx with color-coded status (PASSED, FAILED, GAP), bug tracking IDs, and execution timestamps.
