"""Persistencia liviana de resultados del agente IA — SQLite embebido, sin dependencias extra."""
import sqlite3
import asyncio
from pathlib import Path

DB_PATH = Path(__file__).parent / "ai_results.db"


def _init_db() -> None:
    con = sqlite3.connect(DB_PATH)
    con.execute("""
        CREATE TABLE IF NOT EXISTS ai_results (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            commitment_id    INTEGER NOT NULL,
            ts               TEXT NOT NULL DEFAULT (datetime('now')),
            fulfilled        INTEGER NOT NULL,
            confidence       REAL    NOT NULL,
            reasoning        TEXT,
            evidence_summary TEXT,
            tx_hash          TEXT
        )
    """)
    con.execute("CREATE INDEX IF NOT EXISTS idx_cid ON ai_results(commitment_id)")
    con.commit()
    con.close()


_init_db()


async def save_result(
    commitment_id: int,
    fulfilled: bool,
    confidence: float,
    reasoning: str,
    evidence_summary: str,
    tx_hash: str | None = None,
) -> None:
    def _write():
        con = sqlite3.connect(DB_PATH)
        con.execute(
            """INSERT INTO ai_results
               (commitment_id, fulfilled, confidence, reasoning, evidence_summary, tx_hash)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (commitment_id, int(fulfilled), confidence, reasoning, evidence_summary, tx_hash),
        )
        con.commit()
        con.close()

    await asyncio.to_thread(_write)


async def get_last_result(commitment_id: int) -> dict | None:
    def _read():
        con = sqlite3.connect(DB_PATH)
        con.row_factory = sqlite3.Row
        row = con.execute(
            "SELECT * FROM ai_results WHERE commitment_id=? ORDER BY id DESC LIMIT 1",
            (commitment_id,),
        ).fetchone()
        con.close()
        return dict(row) if row else None

    return await asyncio.to_thread(_read)
