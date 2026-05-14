import arxiv
import requests
import os
import json
import yaml
import sqlite3
from datetime import datetime

def load_config():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(script_dir, "config.yaml")
    with open(config_path, "r") as f:
        return yaml.safe_load(f)

def get_db_connection():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(script_dir, "papers.db")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def get_existing_ids(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM papers")
    return {row['id'] for row in cursor.fetchall()}

def save_paper_to_db(conn, paper_id, info):
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR IGNORE INTO papers 
        (id, title, authors, published, summary, pdf_url, local_path, source, downloaded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        paper_id,
        info.get('title'),
        json.dumps(info.get('authors', [])),
        info.get('published'),
        info.get('summary'),
        info.get('pdf_url'),
        info.get('local_path'),
        info.get('source'),
        info.get('downloaded_at')
    ))
    conn.commit()

def fetch_hf_daily_papers():
    url = "https://huggingface.co/api/daily_papers"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"Error fetching HF papers: {e}")
    return []

def sanitize_filename(title):
    return "".join(c for c in title if c.isalnum() or c in (" ", "_")).rstrip().replace(" ", "_")

def download_pdf(url, filepath):
    try:
        response = requests.get(url, stream=True, timeout=30)
        if response.status_code == 200:
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            return True
    except Exception as e:
        print(f"Failed to download {url}: {e}")
    return False

def download_from_arxiv(config, conn, existing_ids):
    client = arxiv.Client()
    keywords = config['keywords']
    query = " OR ".join([f'all:"{k}"' for k in keywords])
    
    search = arxiv.Search(
        query=query,
        max_results=config['max_results'],
        sort_by=arxiv.SortCriterion.SubmittedDate
    )

    download_count = 0
    script_dir = os.path.dirname(os.path.abspath(__file__))
    download_dir = os.path.abspath(os.path.join(script_dir, config['download_dir']))
    
    for result in client.results(search):
        paper_id = result.entry_id.split("/")[-1]
        if paper_id in existing_ids:
            continue
        
        print(f"Found new arXiv paper: {result.title}")
        safe_title = sanitize_filename(result.title)
        filename = f"{safe_title}.pdf"
        filepath = os.path.join(download_dir, filename)
        
        # Ensure download dir exists
        os.makedirs(download_dir, exist_ok=True)
        
        if download_pdf(result.pdf_url, filepath):
            info = {
                "title": result.title,
                "authors": [a.name for a in result.authors],
                "published": result.published.isoformat(),
                "summary": result.summary,
                "pdf_url": result.pdf_url,
                "local_path": filepath,
                "source": "arxiv",
                "downloaded_at": datetime.now().isoformat()
            }
            save_paper_to_db(conn, paper_id, info)
            existing_ids.add(paper_id)
            download_count += 1
        else:
            print(f"Skipping log for {paper_id} due to download failure.")
        
    return download_count

def check_hf_for_agents(config, conn, existing_ids):
    hf_papers = fetch_hf_daily_papers()
    keywords = [k.lower() for k in config['keywords']]
    download_count = 0
    script_dir = os.path.dirname(os.path.abspath(__file__))
    download_dir = os.path.abspath(os.path.join(script_dir, config['download_dir']))
    
    for entry in hf_papers:
        paper = entry.get('paper', {})
        title = paper.get('title', "")
        summary = paper.get('summary', "")
        paper_id = paper.get('id', "")
        
        if not paper_id or paper_id in existing_ids:
            continue
            
        # Check if title or summary contains keywords
        match = any(k in title.lower() or (summary and k in summary.lower()) for k in keywords)
        if match:
            print(f"Found trending Agent paper on HF: {title}")
            # HF papers are often on arXiv too
            if "/" in paper_id or (len(paper_id) > 5 and paper_id[0].isdigit()):
                client = arxiv.Client()
                search = arxiv.Search(id_list=[paper_id])
                try:
                    results = list(client.results(search))
                    if results:
                        result = results[0]
                        safe_title = sanitize_filename(result.title)
                        filename = f"{safe_title}.pdf"
                        filepath = os.path.join(download_dir, filename)
                        os.makedirs(download_dir, exist_ok=True)
                        
                        if download_pdf(result.pdf_url, filepath):
                            info = {
                                "title": result.title,
                                "authors": [a.name for a in result.authors],
                                "published": result.published.isoformat(),
                                "summary": result.summary,
                                "pdf_url": result.pdf_url,
                                "local_path": filepath,
                                "source": "hf_trending_arxiv",
                                "downloaded_at": datetime.now().isoformat()
                            }
                            save_paper_to_db(conn, paper_id, info)
                            existing_ids.add(paper_id)
                            download_count += 1
                except Exception as e:
                    print(f"Could not download HF paper {paper_id} via arXiv: {e}")
            else:
                info = {
                    "title": title,
                    "summary": summary,
                    "source": "hf_trending",
                    "pdf_url": f"https://huggingface.co/papers/{paper_id}",
                    "downloaded_at": datetime.now().isoformat(),
                    "note": "PDF not downloaded automatically"
                }
                save_paper_to_db(conn, paper_id, info)
                existing_ids.add(paper_id)
    return download_count

def main():
    config = load_config()
    conn = get_db_connection()
    existing_ids = get_existing_ids(conn)
    
    print("Checking for new papers...")
    arxiv_count = download_from_arxiv(config, conn, existing_ids)
    hf_count = check_hf_for_agents(config, conn, existing_ids)
    
    conn.close()
    print(f"Done! Downloaded {arxiv_count} from arXiv and found {hf_count} from HF.")

if __name__ == "__main__":
    main()
