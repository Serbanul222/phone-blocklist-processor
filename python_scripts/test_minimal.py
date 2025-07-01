#!/usr/bin/env python3
"""
Minimal test script to debug the issue
"""
import sys
import json
import argparse

def main():
    print("Test script started", file=sys.stderr)
    
    parser = argparse.ArgumentParser(description='Test script')
    parser.add_argument('input_file', help='Input file path')
    parser.add_argument('--output', help='Output file path')
    parser.add_argument('--phone-column', help='Phone column name')
    parser.add_argument('--json-output', action='store_true', help='JSON output')
    
    try:
        args = parser.parse_args()
        print(f"Arguments parsed successfully: {args}", file=sys.stderr)
        
        # Test imports
        import pandas as pd
        print("Pandas imported OK", file=sys.stderr)
        
        import requests
        print("Requests imported OK", file=sys.stderr)
        
        # Try to read the CSV file
        df = pd.read_csv(args.input_file)
        print(f"CSV loaded successfully: {len(df)} rows, columns: {list(df.columns)}", file=sys.stderr)
        
        # Mock output
        test_stats = {
            "total_rows": len(df),
            "valid_numbers": len(df) - 10,
            "blocked_numbers": 10,
            "final_rows": len(df) - 20,
            "blocklist_size": 1000,
            "processing_time": 1.0,
            "duplicates_removed": 5
        }
        
        print("Test completed successfully", file=sys.stderr)
        print(json.dumps(test_stats))
        
    except Exception as e:
        print(f"Error occurred: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()