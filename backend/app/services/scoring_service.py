from typing import Any


def derive_scoring(audit_json: dict[str, Any]) -> tuple[float, float, str, bool]:
    total_score = float(audit_json.get("total_score", 0.0))
    percentage = float(audit_json.get("percentage", 0.0))
    fatal_flag = bool(audit_json.get("fatal_flag", False))

    if fatal_flag:
        ranking = "Critical"
    elif percentage >= 90:
        ranking = "A"
    elif percentage >= 75:
        ranking = "B"
    elif percentage >= 60:
        ranking = "C"
    else:
        ranking = "D"

    return total_score, percentage, ranking, fatal_flag
