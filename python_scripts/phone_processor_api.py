#!/usr/bin/env python3
"""
Phone Number Blocklist Processor (API Version - Fixed)
Fixed CSV parsing to handle UTF-8 BOM and quote issues.
Enhanced with dual format export (CSV + Excel).
NEW: Added splitting and plus-stripping options.
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
import zipfile
import io  # Required for in-memory zipping
import xlsxwriter

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

    # --- MODIFIED EXPORT FUNCTION ---
    def export_file(self, df: pd.DataFrame, output_path: str, strip_plus: bool, split_size: int) -> bool:
        """
        Export the DataFrame.
        - If split_size > 0, creates .zip files with chunks.
        - If split_size == 0, creates single .csv and .xlsx files.
        - If strip_plus is True, removes '+' from 'telefon' column.
        """
        self.log(f"\n💾 Exporting {len(df):,} unique phone numbers...")
        
        base_path = str(Path(output_path).with_suffix(''))
        
        # Create a copy to avoid modifying the original DataFrame
        final_df = df.copy()
        
        if strip_plus:
            self.log("   Stripping '+' from phone numbers.")
            final_df['telefon'] = final_df['telefon'].str.replace('+', '', regex=False)

        try:
            if split_size > 0:
                self.log(f"   Splitting output into chunks of {split_size:,} rows.")
                self.stats['output_format'] = 'zip'
                
                zip_path_csv = f"{base_path}_csv.zip"
                zip_path_xlsx = f"{base_path}_xlsx.zip"
                
                self.stats['output_files'] = {
                    'csv': Path(zip_path_csv).name,
                    'xlsx': Path(zip_path_xlsx).name
                }

                # --- Create CSV Zip ---
                self.log(f"   Creating CSV zip: {zip_path_csv}")
                with zipfile.ZipFile(zip_path_csv, 'w', zipfile.ZIP_DEFLATED) as zipf_csv:
                    for i, (start, end) in enumerate(range(0, len(final_df), split_size)):
                        df_chunk = final_df.iloc[start:end + split_size]
                        part_num = i + 1
                        chunk_csv_name = f"filtered_part_{part_num}.csv"
                        self.log(f"     ...writing {chunk_csv_name} ({len(df_chunk):,} rows)")
                        csv_data = df_chunk.to_csv(index=False, encoding='utf-8', lineterminator='\n')
                        zipf_csv.writestr(chunk_csv_name, csv_data)
                
                # --- Create Excel Zip ---
                self.log(f"   Creating Excel zip: {zip_path_xlsx}")
                with zipfile.ZipFile(zip_path_xlsx, 'w', zipfile.ZIP_DEFLATED) as zipf_xlsx:
                    for i, (start, end) in enumerate(range(0, len(final_df), split_size)):
                        df_chunk = final_df.iloc[start:end + split_size]
                        part_num = i + 1
                        chunk_xlsx_name = f"filtered_part_{part_num}.xlsx"
                        self.log(f"     ...writing {chunk_xlsx_name} ({len(df_chunk):,} rows)")
                        
                        # Write to in-memory buffer
                        with io.BytesIO() as excel_buffer:
                            with pd.ExcelWriter(excel_buffer, engine='xlsxwriter') as writer:
                                df_chunk.to_excel(writer, sheet_name='Telefon_Filtered', index=False)
                            # Get buffer value before it's closed
                            excel_data = excel_buffer.getvalue()
                        
                        zipf_xlsx.writestr(chunk_xlsx_name, excel_data)

            else:
                self.log("   Creating single CSV and Excel files.")
                self.stats['output_format'] = 'single'
                
                csv_path = f"{base_path}.csv"
                xlsx_path = f"{base_path}.xlsx"
                
                self.stats['output_files'] = {
                    'csv': Path(csv_path).name,
                    'xlsx': Path(xlsx_path).name
                }

                # 1. Create CSV
                final_df.to_csv(csv_path, index=False, encoding='utf-8', lineterminator='\n')
                self.log(f"   ✓ CSV file created: {csv_path}")

                # 2. Create Excel
                try:

                    with pd.ExcelWriter(xlsx_path, engine='xlsxwriter',
                                        options={'strings_to_numbers': False}) as writer:
                        final_df.to_excel(writer, sheet_name='Telefon_Filtered', index=False)
                    self.log(f"   ✓ Excel file created: {xlsx_path}")
                except ImportError:
                    # Fallback to openpyxl
                    final_df.to_excel(xlsx_path, sheet_name='Telefon_Filtered', index=False)
                    self.log(f"   ✓ Excel file created (openpyxl): {xlsx_path}")
            
            self.log("✓ Export complete.")
            return True

        except Exception as e:
            self.log(f"Error exporting file: {e}")
            import traceback
            if not self.json_output:
                traceback.print_exc()
            return False
    # --- END MODIFIED FUNCTION ---

def main():
    parser = argparse.ArgumentParser(description='Process phone numbers against a blocklist (API version).')
    parser.add_argument('input_file', help='Path to the input CSV or Excel file.')
    parser.add_argument('-o', '--output', default='filtered_output', help='Base path for the output file(s) (no extension).')
    parser.add_argument('--phone-column', required=True, help='Name of the phone number column.')
    parser.add_argument('--json-output', action='store_true', help='Output statistics as JSON for API consumption.')
    # --- ADDED ARGUMENTS ---
    parser.add_argument('--strip-plus', action='store_true', help='Remove the "+" prefix from output phone numbers.')
    parser.add_argument('--split-size', type=int, default=0, help='Split output into chunks of this size. 0 means no splitting.')
    # --- END ADDED ARGUMENTS ---
    
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
    
    # --- PASS NEW ARGS TO EXPORT ---
    if processor.export_file(filtered_df, args.output, args.strip_plus, args.split_size):
        if args.json_output:
            # Output JSON statistics for the API
            print(json.dumps(processor.stats))
        else:
            processor.log(f"\n🎉 PROCESS COMPLETED SUCCESSFULLY!")
            processor.log("-" * 60)
            processor.log(f"   Input file: {args.input_file}")
            processor.log(f"   Output file(s) base: {args.output}")
            processor.log(f"   Unique phone numbers: {processor.stats['final_rows']:,}")
            processor.log("=" * 60)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()