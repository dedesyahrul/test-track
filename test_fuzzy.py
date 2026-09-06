import sys
from sqlalchemy import create_engine, text
from rapidfuzz import fuzz

db_url = 'postgresql://postgres:secret123@localhost:5433/db_sit'
engine = create_engine(db_url)

with engine.connect() as conn:
    orphans = conn.execute(text("SELECT id, defect_id, summary, module_id FROM defects WHERE issue_link IS NULL OR issue_link = '';")).fetchall()
    
    cases = conn.execute(text("SELECT id, test_case_id, summary, module_id FROM test_cases;")).fetchall()
    
    print(f"Mencari pasangan untuk {len(orphans)} Orphaned Defects...\n")
    
    matched_count = 0
    for d in orphans:
        best_score = 0
        best_tc = None
        
        # Cari di modul yang sama
        candidates = [c for c in cases if c.module_id == d.module_id]
        
        for c in candidates:
            # Hitung kemiripan kata menggunakan token set ratio (tidak peduli urutan kata)
            score = fuzz.token_set_ratio(str(d.summary).lower(), str(c.summary).lower())
            if score > best_score:
                best_score = score
                best_tc = c
                
        # Jika kemiripan sangat tinggi (> 80%)
        if best_score > 80 and best_tc:
            print(f"[MATCH {best_score:.1f}%] Defect: {d.defect_id} | {str(d.summary)[:70]}...")
            print(f"   ---> Linked to TC: {best_tc.test_case_id} | {str(best_tc.summary)[:70]}...\n")
            matched_count += 1

    print(f"Total berhasil dicocokkan otomatis: {matched_count}")
