from rapidfuzz import fuzz
from sentence_transformers import SentenceTransformer
import re

class DefectTestCaseMatcher:
    def __init__(self):
        self.model = SentenceTransformer('paraphrase-MiniLM-L6-v2')
        self.context_keywords = ['regression', 'fail', 'failed', 'login', 'button', 'input', 'output', 'click', 'submit', 'error', 'not working', 'tidak']

    def clean_text(self, text):
        if not text:
            return ""
        text = text.lower().strip()
        text = re.sub(r'\s+', ' ', text)
        return text

    def match(self, tc, defect):
        """
        tc: dict with keys: summary, step_text (optional), sheet_name, import_file_name, sub_module_name
        defect: dict with keys: summary, keterangan, sheet_name, import_file_name, sub_module_name, defect_code
        """
        # Prepare texts
        tc_text = f"{tc.get('summary', '')} {tc.get('step_text', '')}"
        def_text = f"{defect.get('summary', '')} {defect.get('keterangan', '')}"

        tc_clean = self.clean_text(tc_text)
        def_clean = self.clean_text(def_text)

        # 1. Fuzzy score
        fuzz_score = fuzz.ratio(tc_clean, def_clean)
        if fuzz_score > 75:
            return ("fuzzy", fuzz_score / 100.0, {"source": "fuzzy", "score": fuzz_score})

        # 2. Semantic similarity
        try:
            sim = self.model.encode([tc_clean])[0] @ self.model.encode([def_clean])[0]
            if sim > 0.6:
                return ("semantic", float(sim), {"source": "semantic"})
        except:
            pass

        # 3. Exact match on defect_code or test_case_id
        if tc.get('test_case_id') and str(tc['test_case_id']).lower() == str(defect.get('issue_link') or '').lower():
            return ("exact", 1.0, {"source": "exact"})

        if defect.get('defect_code') and str(defect.get('defect_code')).lower() == str(tc.get('test_case_id') or '').lower():
            return ("exact", 1.0, {"source": "exact"})

        # 4. sheet_name match
        if tc.get('sheet_name') and tc['sheet_name'] == defect.get('sheet_name'):
            return ("sheet", 1.0, {"source": "sheet_name"})

        # 5. import_file_name match
        if tc.get('import_file_name') and tc['import_file_name'] == defect.get('import_file_name'):
            return ("file", 1.0, {"source": "import_file_name"})

        # 6. sub_module match
        if tc.get('sub_module_name') and tc['sub_module_name'] == defect.get('sub_module_name'):
            return ("submodule", 1.0, {"source": "sub_module"})

        # 7. Contextual keywords
        if any(kw in tc_clean or kw in def_clean for kw in self.context_keywords):
            return ("context", 0.8, {"source": "context_keyword"})

        return None
