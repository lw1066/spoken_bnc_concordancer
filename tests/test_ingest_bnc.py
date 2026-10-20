import shutil
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
INGEST_SCRIPT = PROJECT_ROOT / "scripts" / "ingest_bnc.py"
XML_FIXTURE = PROJECT_ROOT / "tests" / "fixtures" / "SQ2W-tgd.xml"


class TestBncIngestion(unittest.TestCase):
    def test_ingest_builds_database_from_one_xml_file(self):
        # Build an isolated project structure for this test.
        with tempfile.TemporaryDirectory(prefix="bnc_ingest_test_") as temp_dir:
            temp_root = Path(temp_dir)
            scripts_dir = temp_root / "scripts"
            corpus_dir = temp_root / "corpus_files"

            scripts_dir.mkdir()
            corpus_dir.mkdir()

            shutil.copy2(INGEST_SCRIPT, scripts_dir / "ingest_bnc.py")
            shutil.copy2(XML_FIXTURE, corpus_dir / "SQ2W-tgd.xml")

            test_db = temp_root / "bnc_corpus.db"

            # Run ingestion only inside the temporary project.
            result = subprocess.run(
                [sys.executable, str(scripts_dir / "ingest_bnc.py")],
                cwd=temp_root,
                capture_output=True,
                text=True,
                timeout=120,
            )

            self.assertEqual(
                result.returncode,
                0,
                msg=f"Ingestion failed.\nSTDOUT:\n{result.stdout}\n"
                    f"STDERR:\n{result.stderr}",
            )
            self.assertTrue(test_db.exists(), "The test database was not created.")

            # Verify the database contents.
            with sqlite3.connect(test_db) as conn:
                texts = conn.execute(
                    "SELECT COUNT(*) FROM texts"
                ).fetchone()[0]

                utterances = conn.execute(
                    "SELECT COUNT(*) FROM utterances"
                ).fetchone()[0]

                words = conn.execute(
                    "SELECT COUNT(*) FROM words"
                ).fetchone()[0]

                fts_rows = conn.execute(
                    "SELECT COUNT(*) FROM utterances_fts"
                ).fetchone()[0]

            self.assertEqual(texts, 1)
            self.assertEqual(utterances, 600)
            self.assertEqual(words, 6938)
            self.assertEqual(fts_rows, 600)


if __name__ == "__main__":
    unittest.main()
