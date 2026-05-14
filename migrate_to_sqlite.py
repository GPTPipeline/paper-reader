import sqlite3
import json
import os

def migrate():
    json_file = 'downloaded_papers.json'
    db_file = 'papers.db'
    
    if not os.path.exists(json_file):
        print(f"Error: {json_file} not found.")
        return

    # Connect to (or create) the database
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()

    # Create the table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS papers (
            id TEXT PRIMARY KEY,
            title TEXT,
            authors TEXT,
            published TEXT,
            summary TEXT,
            pdf_url TEXT,
            local_path TEXT,
            source TEXT,
            downloaded_at TEXT,
            status TEXT DEFAULT 'UNREAD',
            category TEXT,
            tags TEXT DEFAULT '[]',
            notebook_status TEXT DEFAULT 'NOT_ADDED',
            last_opened_at TEXT,
            notes TEXT
        )
    ''')

    # Load JSON data
    with open(json_file, 'r') as f:
        data = json.load(f)

    # Insert data
    count = 0
    for paper_id, info in data.items():
        try:
            cursor.execute('''
                INSERT OR IGNORE INTO papers 
                (id, title, authors, published, summary, pdf_url, local_path, source, downloaded_at, status, category, tags, notebook_status, last_opened_at, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                paper_id,
                info.get('title'),
                json.dumps(info.get('authors', [])),
                info.get('published'),
                info.get('summary'),
                info.get('pdf_url'),
                info.get('local_path'),
                info.get('source'),
                info.get('downloaded_at'),
                info.get('status', 'UNREAD'),
                info.get('category'),
                json.dumps(info.get('tags', [])),
                info.get('notebook_status', 'NOT_ADDED'),
                info.get('last_opened_at'),
                info.get('notes')
            ))
            count += 1
        except Exception as e:
            print(f"Failed to insert {paper_id}: {e}")

    conn.commit()
    conn.close()
    print(f"Successfully migrated {count} papers to {db_file}")

if __name__ == '__main__':
    migrate()
