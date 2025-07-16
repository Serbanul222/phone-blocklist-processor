#!/usr/bin/env python3
"""
Phone Number Blocklist Processor (API Version - Fixed)
Fixed CSV parsing to handle UTF-8 BOM and quote issues.
"""

import pandas as pd
import requests
import re
import json
import argparse
import sys
import time
from pathlib import Path
from typing import Optional, Set
from tqdm import tqdm
from openpyxl.utils import get_column_letter

def normalize_phone_number(phone) -> Optional[str]:
    """
    Normalize a phone number to international E.164 format.
    Handles string, integer, or float inputs gracefully.
    """
    if pd.isna(phone):
        return None
    
    phone_str = str(phone)
    if phone_str.endswith('.0'):
        phone_str = phone_str[:-2]
    
    phone_str = phone_str.strip()
    if not phone_str or phone_str.startswith('*'):
        return None

    cleaned = re.sub(r'[^\d+]', '', phone_str)
    if len(re.sub(r'\D', '', cleaned)) < 8:
        return None

    if cleaned.startswith('+'):
        return cleaned
    
    if cleaned.startswith('40'):
        return f"+{cleaned}"
    if cleaned.startswith('0040'):
        return f"+{cleaned[2:]}"
    if cleaned.startswith('0') and len(cleaned) > 8:
        return f"+40{cleaned[1:]}"
    if len(cleaned) == 9 and cleaned.startswith('7'):
        return f"+40{cleaned}"
    if len(cleaned) in [8, 9] and cleaned.startswith(('2', '3')):
        return f"+40{cleaned}"

    if len(cleaned) >= 11:
        return f"+{cleaned}"
    
    return None

class PhoneBlocklistProcessor:
    def __init__(self, api_url: str, json_output: bool = False):
        self.api_url = api_url
        self.blocklist: Set[str] = set()
        self.json_output = json_output
        self.stats = {}
    
    def log(self, message: str):
        """Log message only if not in JSON output mode"""
        if not self.json_output:
            print(message)
    
    def fetch_blocklist(self) -> bool:
        """Fetch and process the blocklist from the API."""
        self.log("Fetching blocklist from API...")
        
        try:
            with requests.Session() as session:
                response = session.get(self.api_url, timeout=30)
                response.raise_for_status()
            data = response.json()
            
            if data.get('status') != 0:
                self.log(f"API Error: {data.get('message', 'Unknown error')}")
                return False
                
            api_records = data.get('details', [])
            raw_numbers = [item.get('phonenumber') for item in api_records if item.get('phonenumber')]
            normalized_numbers = [norm for norm in (normalize_phone_number(n) for n in raw_numbers) if norm]
            initial_count = len(normalized_numbers)
            self.blocklist = set(normalized_numbers)
            
            # Store stats
            self.stats['blocklist_size'] = len(self.blocklist)
            self.stats['duplicates_removed'] = initial_count - len(self.blocklist)
            
            self.log(f"\n📊 API BLOCKLIST PROCESSING REPORT:")
            self.log(f"   Total API records: {len(api_records):,}")
            self.log(f"   Valid, normalized numbers: {initial_count:,}")
            self.log(f"   Duplicates removed: {initial_count - len(self.blocklist):,}")
            self.log(f"   ✓ Final unique blocklist size: {len(self.blocklist):,}")
            
            return True
            
        except requests.RequestException as e:
            self.log(f"Error fetching blocklist: {e}")
            return False
        except json.JSONDecodeError as e:
            self.log(f"Error parsing API response: {e}")
            return False

    def load_file(self, file_path: str) -> Optional[pd.DataFrame]:
        """Load CSV or Excel file into a DataFrame."""
        self.log(f"\n📂 Loading input file: {file_path}")
        path = Path(file_path)
        
        try:
            if path.suffix.lower() in ['.xlsx', '.xls']:
                df = pd.read_excel(file_path)
            elif path.suffix.lower() == '.csv':
                # Enhanced CSV reading to handle various BOM types and quote issues
                encodings_to_try = [
                    'utf-8-sig',    # UTF-8 with BOM (EF BB BF)
                    'utf-16',       # UTF-16 with BOM (FF FE or FE FF) 
                    'utf-8',        # Plain UTF-8
                    'latin1',       # Windows-1252/ISO-8859-1
                    'cp1252'        # Windows code page
                ]
                
                df = None
                for encoding in encodings_to_try:
                    try:
                        # Try with proper quote handling
                        df = pd.read_csv(file_path, encoding=encoding, engine='python', 
                                       quoting=1, on_bad_lines='warn')
                        self.log(f"✓ Successfully parsed CSV with {encoding} encoding")
                        break
                    except Exception:
                        try:
                            # Try with more permissive parsing
                            df = pd.read_csv(file_path, encoding=encoding, engine='python',
                                           sep=None, quoting=3, on_bad_lines='warn')
                            self.log(f"✓ Successfully parsed CSV with {encoding} (flexible)")
                            break
                        except Exception:
                            continue
                
                if df is None:
                    # Final fallback: Very basic parsing
                    df = pd.read_csv(file_path, encoding='utf-8', engine='python',
                                   on_bad_lines='skip', quoting=3, encoding_errors='replace')
                    self.log(f"✓ Parsed CSV with fallback (some characters may be replaced)")
            else:
                self.log(f"Error: Unsupported file format '{path.suffix}'. Please use CSV or Excel.")
                return None
                
            # Clean column names - remove BOM and whitespace
            df.columns = df.columns.str.strip().str.replace('\ufeff', '')
                
            self.log(f"✓ Successfully loaded file with {len(df):,} rows and {len(df.columns)} columns.")
            self.log(f"✓ Columns found: {list(df.columns)}")
            return df
            
        except FileNotFoundError:
            self.log(f"Error: File not found at {file_path}")
            return None
        except Exception as e:
            self.log(f"Error loading file: {e}")
            return None

    def process_file(self, df: pd.DataFrame, phone_col: str) -> pd.DataFrame:
        """Process the DataFrame and return only 'telefon' column with filtered numbers."""
        self.log(f"\n⚙️  Processing {len(df):,} rows from column '{phone_col}'...")
        
        start_time = time.time()
        
        # Normalize phone numbers
        if not self.json_output:
            tqdm.pandas(desc="   Normalizing numbers", unit=" numbers")
            normalized_numbers = df[phone_col].progress_apply(normalize_phone_number)
        else:
            normalized_numbers = df[phone_col].apply(normalize_phone_number)
        
        # Filter against blocklist - keep only numbers NOT in blocklist
        is_blocked = normalized_numbers.isin(self.blocklist)
        filtered_numbers = normalized_numbers[~is_blocked & normalized_numbers.notna()]
        
        # Create output DataFrame with only 'telefon' column
        output_df = pd.DataFrame({
            'telefon': filtered_numbers
        })
        
        # Remove duplicates
        output_df = output_df.drop_duplicates().reset_index(drop=True)
        
        total_rows = len(df)
        valid_normalized = normalized_numbers.notna().sum()
        blocked_numbers = is_blocked.sum()
        
        # Store processing stats
        processing_time = time.time() - start_time
        self.stats.update({
            'total_rows': total_rows,
            'valid_numbers': int(valid_normalized),
            'blocked_numbers': int(blocked_numbers),
            'final_rows': len(output_df),
            'processing_time': round(processing_time, 2)
        })
        
        self.log(f"\n📊 FILE PROCESSING STATISTICS:")
        self.log(f"   Total rows processed: {total_rows:,}")
        if total_rows > 0:
            self.log(f"   Valid, normalized numbers: {valid_normalized:,} ({valid_normalized/total_rows:.2%})")
        else:
            self.log(f"   Valid, normalized numbers: 0")
        self.log(f"   Numbers found in blocklist (removed): {blocked_numbers:,}")
        self.log(f"   Final unique phone numbers: {len(output_df):,}")

        return output_df

    def export_file(self, df: pd.DataFrame, output_path: str) -> bool:
        """Export the DataFrame with phone numbers in 'telefon' column."""
        self.log(f"\n💾 Exporting {len(df):,} unique phone numbers to {output_path}...")
        
        try:
            if Path(output_path).suffix.lower() == '.xlsx':
                with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
                    # Write data to Excel
                    df.to_excel(writer, index=False, sheet_name='Telefon_Filtered')

                    # Format the telefon column as text
                    worksheet = writer.sheets['Telefon_Filtered']
                    try:
                        col_idx = df.columns.get_loc('telefon') + 1
                        col_letter = get_column_letter(col_idx)
                        worksheet.column_dimensions[col_letter].number_format = '@'
                        worksheet.column_dimensions[col_letter].auto_size = True
                        self.log(f"   ✓ Applied text formatting to column '{col_letter}' to preserve phone numbers.")
                    except KeyError:
                        self.log("   Warning: 'telefon' column formatting skipped.")
            else:
                # CSV export
                df.to_csv(output_path, index=False, encoding='utf-8')
        
            self.log("✓ Export complete.")
            return True
        
        except Exception as e:
            self.log(f"Error exporting file: {e}")
            return False

def main():
    parser = argparse.ArgumentParser(description='Process phone numbers against a blocklist (API version).')
    parser.add_argument('input_file', help='Path to the input CSV or Excel file.')
    parser.add_argument('-o', '--output', default='filtered_output.xlsx', help='Path for the output file (.xlsx or .csv).')
    parser.add_argument('--phone-column', required=True, help='Name of the phone number column.')
    parser.add_argument('--json-output', action='store_true', help='Output statistics as JSON for API consumption.')
    
    args = parser.parse_args()
    
    api_url = "https://api.sendsms.ro/json?action=blocklist_get&username=lensa&password=FrIpredgrggtsd0b8-h08v74gmrdbgjk4h6d1o__xevjetzb"
    
    processor = PhoneBlocklistProcessor(api_url, args.json_output)
    
    if not processor.fetch_blocklist():
        sys.exit(1)
        
    df = processor.load_file(args.input_file)
    if df is None:
        sys.exit(1)
        
    # Check if the specified column exists (handle BOM and case issues)
    available_columns = list(df.columns)
    phone_column_clean = args.phone_column.strip().replace('\ufeff', '')
    
    # Try to find the column (exact match, case insensitive, or BOM variations)
    matched_column = None
    for col in available_columns:
        col_clean = col.strip().replace('\ufeff', '')
        if (col == args.phone_column or 
            col_clean == phone_column_clean or 
            col.lower() == args.phone_column.lower() or
            col_clean.lower() == phone_column_clean.lower()):
            matched_column = col
            break
    
    if matched_column is None:
        processor.log(f"Error: Column '{args.phone_column}' not found in file.")
        processor.log(f"Available columns: {available_columns}")
        sys.exit(1)
    
    processor.log(f"✓ Using column: '{matched_column}' (requested: '{args.phone_column}')")
    
    filtered_df = processor.process_file(df, matched_column)
    
    if processor.export_file(filtered_df, args.output):
        if args.json_output:
            # Output JSON statistics for the API
            print(json.dumps(processor.stats))
        else:
            processor.log(f"\n🎉 PROCESS COMPLETED SUCCESSFULLY!")
            processor.log("-" * 60)
            processor.log(f"   Input file: {args.input_file}")
            processor.log(f"   Output file: {args.output}")
            processor.log(f"   Unique phone numbers: {processor.stats['final_rows']:,}")
            processor.log("=" * 60)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()