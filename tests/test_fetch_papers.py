import unittest
from unittest.mock import patch, MagicMock
import os
import sqlite3
import json
import fetch_papers

class TestFetchPapers(unittest.TestCase):
    def setUp(self):
        # Use an in-memory database for testing
        self.conn = sqlite3.connect(':memory:')
        self.conn.row_factory = sqlite3.Row
        cursor = self.conn.cursor()
        cursor.execute('''
            CREATE TABLE papers (
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
                notes TEXT,
                title_hash TEXT
            )
        ''')
        self.conn.commit()

    def tearDown(self):
        self.conn.close()

    def test_get_existing_ids(self):
        cursor = self.conn.cursor()
        cursor.execute("INSERT INTO papers (id) VALUES ('123'), ('456')")
        self.conn.commit()
        
        ids = fetch_papers.get_existing_ids(self.conn)
        self.assertEqual(ids, {'123', '456'})

    def test_save_paper_to_db(self):
        info = {
            "title": "Test Title",
            "authors": ["Author A", "Author B"],
            "published": "2023-01-01",
            "summary": "Test Summary",
            "pdf_url": "http://example.com/test.pdf",
            "local_path": "/path/to/test.pdf",
            "source": "arxiv",
            "category": "cs.AI",
            "tags": ["agent"],
            "downloaded_at": "2023-01-02"
        }
        fetch_papers.save_paper_to_db(self.conn, "test_id", info)
        
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM papers WHERE id='test_id'")
        row = cursor.fetchone()
        
        self.assertIsNotNone(row)
        self.assertEqual(row['title'], "Test Title")
        self.assertEqual(json.loads(row['authors']), ["Author A", "Author B"])
        self.assertEqual(row['status'], "UNREAD")
        self.assertEqual(row['category'], "cs.AI")
        self.assertEqual(json.loads(row['tags']), ["agent"])
        self.assertEqual(row['notebook_status'], "NOT_ADDED")
        self.assertEqual(row['title_hash'], fetch_papers.title_hash("Test Title"))

    def test_title_hash_normalizes_title_for_duplicate_detection(self):
        self.assertEqual(
            fetch_papers.title_hash("A Paper: About Agents!"),
            fetch_papers.title_hash("a paper about agents")
        )

    def test_canonical_arxiv_id_strips_version(self):
        self.assertEqual(fetch_papers.canonical_arxiv_id("http://arxiv.org/abs/2301.12345v2"), "2301.12345")
        self.assertEqual(fetch_papers.canonical_arxiv_id("2301.12345v1"), "2301.12345")

    def test_get_existing_paper_keys_includes_ids_and_title_hashes(self):
        fetch_papers.save_paper_to_db(self.conn, "2301.12345v1", {
            "title": "Shared Agent Paper",
            "authors": [],
            "source": "arxiv",
        })

        keys = fetch_papers.get_existing_paper_keys(self.conn)

        self.assertTrue(fetch_papers.is_duplicate_paper("2301.12345", "Different Title", keys))
        self.assertTrue(fetch_papers.is_duplicate_paper("hf-paper", "Shared Agent Paper", keys))
        self.assertFalse(fetch_papers.is_duplicate_paper("hf-new", "A New Agent Paper", keys))

    @patch('fetch_papers.requests.get')
    def test_fetch_hf_daily_papers_success(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [{"id": "hf1", "paper": {"title": "HF Paper"}}]
        mock_get.return_value = mock_response
        
        papers = fetch_papers.fetch_hf_daily_papers()
        self.assertEqual(len(papers), 1)
        self.assertEqual(papers[0]['id'], "hf1")

    @patch('fetch_papers.requests.get')
    def test_fetch_hf_daily_papers_failure(self, mock_get):
        mock_get.side_effect = Exception("Network error")
        papers = fetch_papers.fetch_hf_daily_papers()
        self.assertEqual(papers, [])

    @patch('fetch_papers.arxiv.Client')
    @patch('fetch_papers.download_pdf')
    def test_download_from_arxiv(self, mock_download_pdf, mock_arxiv_client):
        # Setup mock results
        mock_result = MagicMock()
        mock_result.entry_id = "http://arxiv.org/abs/2301.12345v1"
        mock_result.title = "Arxiv Paper Title"
        author = MagicMock()
        author.name = "Author A"
        mock_result.authors = [author]
        mock_result.published = datetime(2023, 1, 1)
        mock_result.summary = "Summary"
        mock_result.pdf_url = "http://arxiv.org/pdf/2301.12345v1"
        mock_result.primary_category = "cs.AI"
        
        mock_client_instance = mock_arxiv_client.return_value
        mock_client_instance.results.return_value = [mock_result]
        
        mock_download_pdf.return_value = True
        
        config = {
            'keywords': ['agent'],
            'max_results': 1,
            'download_dir': '../papers'
        }
        existing_ids = set()
        existing_keys = {
            "ids": existing_ids,
            "canonical_arxiv_ids": set(),
            "title_hashes": set(),
        }
        
        count = fetch_papers.download_from_arxiv(config, self.conn, existing_keys)
        
        self.assertEqual(count, 1)
        self.assertIn('2301.12345v1', existing_ids)
        
        cursor = self.conn.cursor()
        cursor.execute("SELECT title, category FROM papers WHERE id='2301.12345v1'")
        row = cursor.fetchone()
        self.assertEqual(row['title'], "Arxiv Paper Title")
        self.assertEqual(row['category'], "cs.AI")

    @patch('fetch_papers.arxiv.Client')
    @patch('fetch_papers.fetch_hf_daily_papers')
    @patch('fetch_papers.download_pdf')
    def test_hf_trending_skips_paper_with_existing_arxiv_title(self, mock_download_pdf, mock_fetch_hf, mock_arxiv_client):
        fetch_papers.save_paper_to_db(self.conn, "2301.12345v1", {
            "title": "Shared Agent Paper",
            "authors": [],
            "source": "arxiv",
        })
        mock_fetch_hf.return_value = [{
            "paper": {
                "id": "hf-shared",
                "title": "Shared Agent Paper",
                "summary": "agent paper",
            }
        }]
        config = {
            'keywords': ['agent'],
            'download_dir': '../papers'
        }

        count = fetch_papers.check_hf_for_agents(config, self.conn, fetch_papers.get_existing_paper_keys(self.conn))

        self.assertEqual(count, 0)
        self.assertFalse(mock_download_pdf.called)
        self.assertFalse(mock_arxiv_client.called)

    @patch('fetch_papers.arxiv.Client')
    @patch('fetch_papers.fetch_hf_daily_papers')
    @patch('fetch_papers.download_pdf')
    def test_hf_trending_stores_arxiv_result_with_arxiv_id_when_new(self, mock_download_pdf, mock_fetch_hf, mock_arxiv_client):
        mock_fetch_hf.return_value = [{
            "paper": {
                "id": "2301.99999",
                "title": "New Agent Paper",
                "summary": "agent paper",
            }
        }]
        mock_result = MagicMock()
        mock_result.entry_id = "http://arxiv.org/abs/2301.99999v1"
        mock_result.title = "New Agent Paper"
        author = MagicMock()
        author.name = "Author A"
        mock_result.authors = [author]
        mock_result.published = datetime(2023, 1, 1)
        mock_result.summary = "Summary"
        mock_result.pdf_url = "http://arxiv.org/pdf/2301.99999v1"
        mock_result.primary_category = "cs.AI"
        mock_arxiv_client.return_value.results.return_value = [mock_result]
        mock_download_pdf.return_value = True
        config = {
            'keywords': ['agent'],
            'download_dir': '../papers'
        }

        count = fetch_papers.check_hf_for_agents(config, self.conn, fetch_papers.get_existing_paper_keys(self.conn))

        self.assertEqual(count, 1)
        cursor = self.conn.cursor()
        cursor.execute("SELECT id, source FROM papers WHERE title='New Agent Paper'")
        row = cursor.fetchone()
        self.assertEqual(row["id"], "2301.99999v1")
        self.assertEqual(row["source"], "hf_trending_arxiv")

from datetime import datetime
if __name__ == '__main__':
    unittest.main()
