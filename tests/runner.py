import argparse
import os
import sys
import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from tests.core.reporter import reporter
from tests.config import EXCEL_TRACKER_PATH

def main():
    parser = argparse.ArgumentParser(description="CPA-V2 Modular Test Suite Runner")
    parser.add_argument("--cat", type=int, help="Run specific category number (1-28)")
    parser.add_argument("--ingest", action="store_true", help="Run document ingestion suite only")
    parser.add_argument("-k", "--keyword", type=str, help="Pytest keyword expression filter")
    parser.add_argument("--no-excel", action="store_true", help="Skip updating Excel execution tracker")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose pytest output")
    args = parser.parse_args()

    reporter.reset()

    pytest_args = ["-q", "--tb=short", "-s"]
    if args.verbose:
        pytest_args.append("-v")

    test_target_dir = os.path.join(PROJECT_ROOT, "tests", "e2e")

    if args.ingest:
        target = os.path.join(test_target_dir, "test_document_ingestion.py")
        pytest_args.append(target)
    elif args.cat:
        cat_str = f"{args.cat:02d}"
        matching_files = [
            os.path.join(test_target_dir, f) for f in os.listdir(test_target_dir)
            if f.startswith(f"test_{cat_str}_")
        ]
        if not matching_files:
            print(f"Error: No test suite found for category {args.cat}")
            sys.exit(1)
        pytest_args.extend(matching_files)
    else:
        pytest_args.append(test_target_dir)

    if args.keyword:
        pytest_args.extend(["-k", args.keyword])

    print("=" * 80)
    print("   CPA-V2 MODULAR E2E TEST SUITE RUNNER")
    print(f"   Target: {pytest_args[-1]}")
    print("=" * 80 + "\n")

    exit_code = pytest.main(pytest_args)

    reporter.print_summary()

    if not args.no_excel:
        reporter.export_to_excel(EXCEL_TRACKER_PATH)

    sys.exit(exit_code)

if __name__ == "__main__":
    main()
