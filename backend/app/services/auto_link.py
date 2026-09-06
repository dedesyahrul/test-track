from app.database import SessionLocal
from app.models.models import Defect, TestCase, DefectV2
from app.services.matching import DefectTestCaseMatcher
from sqlalchemy.orm import Session

matcher = DefectTestCaseMatcher()

def auto_link_defects(db_session: Session = None):
    # Handle if db_session is generator or None
    is_custom_session = False
    if db_session is not None and hasattr(db_session, "query"):
        db = db_session
    else:
        db = SessionLocal()
        is_custom_session = True

    try:
        # V2 first
        v2_cases = db.query(TestCase).all()
        for tc in v2_cases:
            # Find open defects that match this test case
            tc_defects = db.query(DefectV2).filter(
                DefectV2.test_case_id == tc.id,
                DefectV2.status == 'OPEN'
            ).all()
            
            for defect in tc_defects:
                if not defect.title or not tc.summary:
                    continue
                    
                match = matcher.match({
                    'summary': tc.summary,
                    'step_text': tc.case_description,
                    'sheet_name': tc.sheet_name,
                    'import_file_name': tc.import_file_name,
                    'sub_module_name': tc.module.name if tc.module else None
                }, {
                    'summary': defect.title,
                    'keterangan': defect.description,
                    'sheet_name': getattr(defect, 'sheet_name', None),
                    'import_file_name': getattr(defect, 'import_file_name', None),
                    'sub_module_name': defect.project.project_name if defect.project else None,
                    'defect_code': defect.defect_code
                })
                
                if match:
                    print(f"Auto linked: Defect {defect.defect_code} -> Test Case {tc.test_case_id} ({match[0]})")
        
        db.commit()
        print("Auto linking completed")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        if is_custom_session:
            db.close()