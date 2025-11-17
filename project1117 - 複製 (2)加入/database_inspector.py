#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SQLite 資料庫檢查工具
分析 crawler_data.db 資料庫的結構和內容
"""

import sqlite3
import os
from datetime import datetime

def connect_to_database(db_path):
    """連接到 SQLite 資料庫"""
    try:
        if not os.path.exists(db_path):
            raise FileNotFoundError(f"資料庫檔案不存在: {db_path}")
        
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row  # 讓結果可以用欄位名稱存取
        print(f"[OK] 成功連接到資料庫: {db_path}")
        return conn
    except Exception as e:
        print(f"[ERROR] 連接資料庫失敗: {e}")
        return None

def get_all_tables(conn):
    """獲取資料庫中所有資料表名稱"""
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = [row[0] for row in cursor.fetchall()]
        return tables
    except Exception as e:
        print(f"[ERROR] 獲取資料表列表失敗: {e}")
        return []

def get_table_info(conn, table_name):
    """獲取資料表的欄位資訊"""
    try:
        cursor = conn.cursor()
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()
        return columns
    except Exception as e:
        print(f"❌ 獲取資料表 {table_name} 的欄位資訊失敗: {e}")
        return []

def get_sample_data(conn, table_name, limit=5):
    """獲取資料表的範例資料"""
    try:
        cursor = conn.cursor()
        cursor.execute(f"SELECT * FROM {table_name} LIMIT {limit}")
        rows = cursor.fetchall()
        return rows
    except Exception as e:
        print(f"❌ 獲取資料表 {table_name} 的範例資料失敗: {e}")
        return []

def get_table_count(conn, table_name):
    """獲取資料表的總記錄數"""
    try:
        cursor = conn.cursor()
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        return count
    except Exception as e:
        print(f"❌ 獲取資料表 {table_name} 的記錄數失敗: {e}")
        return 0

def print_separator(title="", width=80):
    """印出分隔線"""
    if title:
        title_line = f" {title} "
        padding = (width - len(title_line)) // 2
        print("=" * padding + title_line + "=" * (width - padding - len(title_line)))
    else:
        print("=" * width)

def print_table_analysis(conn, table_name):
    """分析並顯示單一資料表的完整資訊"""
    print_separator(f"資料表: {table_name}")
    
    # 1. 獲取資料表基本資訊
    record_count = get_table_count(conn, table_name)
    print(f"📊 總記錄數: {record_count:,}")
    
    # 2. 顯示欄位資訊
    print(f"\n🗂️  欄位結構:")
    columns = get_table_info(conn, table_name)
    if columns:
        print(f"{'序號':<4} {'欄位名稱':<20} {'資料類型':<15} {'非空':<6} {'預設值':<15} {'主鍵':<6}")
        print("-" * 70)
        for col in columns:
            cid = col[0]
            name = col[1]
            type_name = col[2] or 'NULL'
            not_null = '是' if col[3] else '否'
            default_value = col[4] or ''
            pk = '是' if col[5] else '否'
            print(f"{cid:<4} {name:<20} {type_name:<15} {not_null:<6} {str(default_value):<15} {pk:<6}")
    else:
        print("⚠️  無法獲取欄位資訊")
    
    # 3. 顯示範例資料
    print(f"\n📋 範例資料 (前5筆):")
    sample_data = get_sample_data(conn, table_name, 5)
    
    if sample_data and columns:
        # 印出欄位標題
        column_names = [col[1] for col in columns]
        header = " | ".join(f"{name:<15}" for name in column_names)
        print(header)
        print("-" * len(header))
        
        # 印出資料
        for row in sample_data:
            row_data = " | ".join(f"{str(value):<15}" for value in row)
            print(row_data)
    elif not sample_data:
        print("📭 此資料表為空")
    else:
        print("⚠️  無法顯示範例資料")
    
    print()  # 空行

def analyze_database(db_path):
    """完整分析資料庫"""
    print_separator(f"SQLite 資料庫分析工具", 80)
    print(f"🕒 分析時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"📁 資料庫路徑: {db_path}")
    print()
    
    # 連接資料庫
    conn = connect_to_database(db_path)
    if not conn:
        return
    
    try:
        # 獲取所有資料表
        tables = get_all_tables(conn)
        
        if not tables:
            print("⚠️  資料庫中沒有找到任何資料表")
            return
        
        print(f"🗃️  發現 {len(tables)} 個資料表:")
        for i, table in enumerate(tables, 1):
            print(f"   {i}. {table}")
        print()
        
        # 分析每個資料表
        for table in tables:
            print_table_analysis(conn, table)
        
        # 顯示資料庫總結
        print_separator("資料庫總結")
        total_records = 0
        for table in tables:
            count = get_table_count(conn, table)
            total_records += count
            print(f"📊 {table}: {count:,} 筆記錄")
        
        print(f"\n📈 總計: {len(tables)} 個資料表，{total_records:,} 筆記錄")
        
    except Exception as e:
        print(f"❌ 分析過程中發生錯誤: {e}")
    
    finally:
        conn.close()
        print(f"\n✅ 資料庫連線已關閉")

def main():
    """主程式"""
    # 資料庫檔案路徑
    current_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(current_dir, 'data', 'crawler_data.db')
    
    # 也檢查同一資料夾下是否有 crawler_data.db
    if not os.path.exists(db_path):
        alternative_path = os.path.join(current_dir, 'crawler_data.db')
        if os.path.exists(alternative_path):
            db_path = alternative_path
        else:
            print(f"❌ 找不到資料庫檔案:")
            print(f"   - {db_path}")
            print(f"   - {alternative_path}")
            return
    
    # 執行分析
    analyze_database(db_path)

if __name__ == "__main__":
    main()