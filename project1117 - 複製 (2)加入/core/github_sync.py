"""
GitHub 資料庫同步模組
從 GitHub 倉庫下載最新的資料庫檔案
"""

import os
import requests
import shutil
from datetime import datetime
import sqlite3
import tempfile

def download_latest_database(github_username="yolok9453", repo_name="crawls-web", branch="master"):
    """
    從 GitHub 下載最新的資料庫檔案
    """
    try:
        # GitHub raw file URL
        db_url = f"https://raw.githubusercontent.com/{github_username}/{repo_name}/{branch}/data/crawler_data.db"
        
        # 本地資料庫路徑
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        local_db_path = os.path.join(project_root, 'data', 'crawler_data.db')
        backup_db_path = os.path.join(project_root, 'data', f'crawler_data_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.db')
        
        # 確保目錄存在
        os.makedirs(os.path.dirname(local_db_path), exist_ok=True)
        
        print(f"🔄 正在從 GitHub 下載最新資料庫...")
        print(f"📥 下載網址: {db_url}")
        
        # 下載檔案
        response = requests.get(db_url, timeout=30)
        response.raise_for_status()
        
        # 備份現有資料庫（如果存在）
        if os.path.exists(local_db_path):
            shutil.copy2(local_db_path, backup_db_path)
            print(f"💾 已備份現有資料庫到: {backup_db_path}")
        
        # 儲存新資料庫
        with open(local_db_path, 'wb') as f:
            f.write(response.content)
        
        print(f"✅ 成功下載資料庫到: {local_db_path}")
        print(f"📊 檔案大小: {len(response.content)} bytes")
        
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ 下載失敗 - 網路錯誤: {e}")
        return False
    except Exception as e:
        print(f"❌ 下載失敗 - 其他錯誤: {e}")
        return False

def check_database_update_time():
    """
    檢查本地資料庫的最後更新時間
    """
    try:
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        local_db_path = os.path.join(project_root, 'data', 'crawler_data.db')
        
        if os.path.exists(local_db_path):
            mtime = os.path.getmtime(local_db_path)
            update_time = datetime.fromtimestamp(mtime)
            print(f"📅 本地資料庫最後更新時間: {update_time.strftime('%Y-%m-%d %H:%M:%S')}")
            return update_time
        else:
            print("❌ 本地資料庫不存在")
            return None
    except Exception as e:
        print(f"❌ 檢查資料庫更新時間失敗: {e}")
        return None

def auto_sync_if_needed(max_age_hours=1):
    """
    如果本地資料庫太舊，自動同步
    返回 True 如果有下載更新，False 如果不需要更新
    """
    try:
        update_time = check_database_update_time()
        
        if update_time is None:
            print("🔄 本地資料庫不存在，開始下載...")
            return download_latest_database()
        
        # 檢查是否需要更新
        now = datetime.now()
        age_hours = (now - update_time).total_seconds() / 3600
        
        if age_hours > max_age_hours:
            print(f"🔄 本地資料庫已 {age_hours:.1f} 小時未更新，開始同步...")
            return download_latest_database()
        else:
            print(f"✅ 本地資料庫夠新（{age_hours:.1f} 小時前），無需同步")
            return False
            
    except Exception as e:
        print(f"❌ 自動同步檢查失敗: {e}")
        return False


def download_latest_daily_deals_db(github_username="yolok9453", repo_name="crawls-web", branch="master"):
    """
    下載 GitHub 上的資料庫檔案到暫存並回傳暫存檔路徑（只用於擷取 daily_deals）。
    返回暫存檔路徑或 None（失敗）。
    """
    try:
        db_url = f"https://raw.githubusercontent.com/{github_username}/{repo_name}/{branch}/data/crawler_data.db"
        print(f"🔄 正在從 GitHub 下載資料庫（僅用於 daily_deals）: {db_url}")

        response = requests.get(db_url, timeout=30)
        response.raise_for_status()

        fd, tmp_path = tempfile.mkstemp(prefix="crawler_data_", suffix=".db")
        os.close(fd)
        with open(tmp_path, 'wb') as f:
            f.write(response.content)

        print(f"✅ 下載完成，暫存檔: {tmp_path}")
        return tmp_path
    except requests.exceptions.RequestException as e:
        print(f"❌ 下載失敗 - 網路錯誤: {e}")
        return None
    except Exception as e:
        print(f"❌ 下載失敗 - 其他錯誤: {e}")
        return None


def sync_daily_deals_from_remote_db(remote_db_path, local_db_path=None, backup=True):
    """
    將遠端資料庫的 daily_deals 表同步到本地資料庫。
    - 會備份本地資料庫檔案（若 backup=True 且檔案存在）
    - 同步策略：刪除 local.daily_deals 全部內容，然後從 remote.daily_deals 匯入（簡潔且可保證一致性）
    返回 True/False
    """
    try:
        if local_db_path is None:
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            local_db_path = os.path.join(project_root, 'data', 'crawler_data.db')

        if not os.path.exists(remote_db_path):
            print(f"❌ 遠端暫存檔不存在: {remote_db_path}")
            return False

        # 備份本地資料庫
        if backup and os.path.exists(local_db_path):
            backup_db_path = os.path.join(os.path.dirname(local_db_path), f'crawler_data_daily_deals_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.db')
            shutil.copy2(local_db_path, backup_db_path)
            print(f"💾 已備份本地資料庫到: {backup_db_path}")

        # 使用 sqlite3 attach 方式進行同步
        conn = sqlite3.connect(local_db_path)
        cursor = conn.cursor()

        cursor.execute("ATTACH DATABASE ? AS remote_db", (remote_db_path,))

        # 檢查 remote 是否有 daily_deals
        cursor.execute("SELECT name FROM remote_db.sqlite_master WHERE type='table' AND name='daily_deals'")
        if cursor.fetchone() is None:
            print("❌ 遠端資料庫中沒有 daily_deals 表，取消同步")
            cursor.execute("DETACH DATABASE remote_db")
            conn.close()
            return False

        # 執行替換：先刪除 local 的 daily_deals，再從 remote 匯入
        cursor.execute("BEGIN")
        cursor.execute("DELETE FROM daily_deals")
        cursor.execute(
            "INSERT OR IGNORE INTO daily_deals (platform, title, price, url, image_url, crawl_time) SELECT platform, title, price, url, image_url, crawl_time FROM remote_db.daily_deals"
        )
        conn.commit()

        cursor.execute("DETACH DATABASE remote_db")
        conn.close()

        print("✅ daily_deals 同步完成")
        return True
    except Exception as e:
        print(f"❌ daily_deals 同步失敗: {e}")
        import traceback
        traceback.print_exc()
        return False


def auto_sync_daily_deals_if_needed(max_age_hours=1):
    """
    檢查 local daily_deals 最新的 crawl_time（若存在），或資料庫檔案最後修改時間，
    如果超過 max_age_hours，則從 GitHub 下載並同步 daily_deals。
    返回 True 如果執行了同步，False 則表示不需要或失敗。
    """
    try:
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        local_db_path = os.path.join(project_root, 'data', 'crawler_data.db')

        latest_time = None
        if os.path.exists(local_db_path):
            try:
                conn = sqlite3.connect(local_db_path)
                cursor = conn.cursor()
                cursor.execute("SELECT MAX(crawl_time) FROM daily_deals")
                row = cursor.fetchone()
                conn.close()
                if row and row[0]:
                    # crawl_time 儲存為 ISO 格式字串，嘗試解析
                    try:
                        latest_time = datetime.fromisoformat(row[0])
                    except Exception:
                        # 無法解析時退回到檔案修改時間
                        latest_time = None
            except Exception:
                latest_time = None

        if latest_time is None and os.path.exists(local_db_path):
            mtime = os.path.getmtime(local_db_path)
            latest_time = datetime.fromtimestamp(mtime)

        if latest_time is None:
            print("🔄 local daily_deals 無資料或 DB 不存在，將直接下載並同步 daily_deals")
            tmp = download_latest_daily_deals_db()
            if tmp:
                try:
                    res = sync_daily_deals_from_remote_db(tmp, local_db_path)
                    os.remove(tmp)
                    return res
                except Exception:
                    if os.path.exists(tmp):
                        os.remove(tmp)
                    return False
            return False

        now = datetime.now()
        age_hours = (now - latest_time).total_seconds() / 3600

        if age_hours > max_age_hours:
            print(f"🔄 daily_deals 最後更新已 {age_hours:.1f} 小時，開始從 GitHub 同步 daily_deals...")
            tmp = download_latest_daily_deals_db()
            if not tmp:
                return False
            try:
                res = sync_daily_deals_from_remote_db(tmp, local_db_path)
                os.remove(tmp)
                return res
            except Exception:
                if os.path.exists(tmp):
                    os.remove(tmp)
                return False
        else:
            print(f"✅ daily_deals 足夠新（{age_hours:.1f} 小時前），無需同步")
            return False
    except Exception as e:
        print(f"❌ auto_sync_daily_deals_if_needed 失敗: {e}")
        return False

if __name__ == "__main__":
    # 測試功能
    print("🧪 測試 GitHub 資料庫同步功能...")
    check_database_update_time()
    download_latest_database()
