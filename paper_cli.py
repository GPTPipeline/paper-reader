import json
import os
import argparse
from pypdf import PdfReader

def load_log(log_file):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    log_path = os.path.join(script_dir, log_file)
    if os.path.exists(log_path):
        with open(log_path, "r") as f:
            return json.load(f)
    return {}

def list_papers(log_data):
    print(f"{'ID':<15} | {'Title'}")
    print("-" * 80)
    for paper_id, info in log_data.items():
        print(f"{paper_id:<15} | {info['title']}")

def show_paper(log_data, paper_id):
    if paper_id not in log_data:
        # Try to find by partial ID or title
        found = False
        for pid, info in log_data.items():
            if paper_id in pid or paper_id.lower() in info['title'].lower():
                paper_id = pid
                found = True
                break
        if not found:
            print(f"Paper {paper_id} not found.")
            return

    info = log_data[paper_id]
    print(f"\nTitle: {info['title']}")
    print(f"Authors: {', '.join(info.get('authors', ['Unknown']))}")
    print(f"Published: {info.get('published', 'N/A')}")
    print(f"Source: {info.get('source', 'N/A')}")
    print("-" * 40)
    print(f"Summary: {info.get('summary', 'No summary available.')}")
    print("-" * 40)
    print(f"Local Path: {info.get('local_path', 'N/A')}")

def read_full_text(log_data, paper_id, pages=2):
    if paper_id not in log_data:
        print(f"Paper {paper_id} not found.")
        return
    
    info = log_data[paper_id]
    local_path = info.get('local_path')
    
    # Ensure local_path is absolute or relative to script
    if local_path and not os.path.isabs(local_path):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        local_path = os.path.abspath(os.path.join(script_dir, local_path))
    
    if not local_path or not os.path.exists(local_path):
        # try fallback
        script_dir = os.path.dirname(os.path.abspath(__file__))
        local_path = os.path.join(script_dir, "..", "papers", os.path.basename(local_path))
    
    if not os.path.exists(local_path):
        print(f"File not found: {local_path}")
        return

    try:
        reader = PdfReader(local_path)
        print(f"\n--- Reading first {pages} pages of {info['title']} ---\n")
        for i in range(min(pages, len(reader.pages))):
            print(f"--- Page {i+1} ---")
            print(reader.pages[i].extract_text())
            print("\n")
    except Exception as e:
        print(f"Error reading PDF: {e}")

def main():
    parser = argparse.ArgumentParser(description="Paper Bot CLI")
    parser.add_argument("action", choices=["list", "show", "read", "fetch"], help="Action to perform")
    parser.add_argument("id", nargs="?", help="Paper ID or partial title")
    parser.add_argument("--pages", type=int, default=2, help="Number of pages to read")
    
    args = parser.parse_args()
    log_file = "downloaded_papers.json"
    log_data = load_log(log_file)

    if args.action == "list":
        list_papers(log_data)
    elif args.action == "show":
        if not args.id:
            print("Please provide a paper ID.")
        else:
            show_paper(log_data, args.id)
    elif args.action == "read":
        if not args.id:
            print("Please provide a paper ID.")
        else:
            show_paper(log_data, args.id) # Show summary first
            read_full_text(log_data, args.id, args.pages)
    elif args.action == "fetch":
        print("Running fetcher...")
        script_dir = os.path.dirname(os.path.abspath(__file__))
        venv_python = os.path.join(script_dir, ".venv", "bin", "python3")
        fetch_script = os.path.join(script_dir, "fetch_papers.py")
        
        python_exe = venv_python if os.path.exists(venv_python) else "python3"
        os.system(f"{python_exe} {fetch_script}")

if __name__ == "__main__":
    main()
