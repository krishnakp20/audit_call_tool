from typing import Any


def derive_scoring(audit_json: dict[str, Any]) -> tuple[float, float, str, bool]:
    total_score = float(audit_json.get("total_score", 0.0))
    percentage = float(audit_json.get("percentage", 0.0))
    fatal_flag = bool(audit_json.get("fatal_flag", audit_json.get("fatal", False)))

    # Always prefer deterministic score computed from section parameters.
    # LLM responses often contain inconsistent top-level values.
    derived_total, derived_percentage = _derive_from_sections(audit_json)
    if derived_total > 0:
        total_score = derived_total
    if derived_percentage > 0:
        percentage = derived_percentage

    if fatal_flag:
        ranking = "Needs Improvement"
        total_score = 0.0
        percentage = 0.0
    elif percentage >= 85:
        ranking = "Excellent"
    elif percentage >= 70:
        ranking = "Good"
    elif percentage >= 50:
        ranking = "Average"
    else:
        ranking = "Needs Improvement"

    return total_score, percentage, ranking, fatal_flag


def _derive_from_sections(audit_json: dict[str, Any]) -> tuple[float, float]:
    sections = audit_json.get("sections")
    if not isinstance(sections, dict):
        return 0.0, 0.0

    total_score = 0.0
    for section in sections.values():
        if not isinstance(section, dict):
            continue
        parameters = section.get("parameters")
        if isinstance(parameters, dict) and parameters:
            for value in parameters.values():
                score_value = _extract_numeric_score(value)
                if score_value is None:
                    continue
                total_score += score_value
            continue

        # Fallback: if parameters are missing, use section score as-is.
        section_score = _extract_numeric_score(section.get("score"))
        if section_score is not None:
            total_score += section_score

    # Business rule from prompt: total_score is direct sum of parameters and percentage is same value.
    # Cap to 100 to keep strict 100-point rubric.
    total_score = max(0.0, min(round(total_score, 2), 100.0))
    percentage = total_score
    return total_score, percentage


def _extract_numeric_score(value: Any) -> float | None:
    if isinstance(value, dict):
        value = value.get("score")
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.strip())
        except ValueError:
            return None
    return None


def normalize_section_scores(audit_json: dict[str, Any]) -> dict[str, Any]:
    payload = dict(audit_json or {})
    sections = payload.get("sections")
    if not isinstance(sections, dict):
        return payload

    updated_sections: dict[str, Any] = {}
    for section_name, section_value in sections.items():
        if not isinstance(section_value, dict):
            updated_sections[section_name] = section_value
            continue

        section_copy = dict(section_value)
        parameters = section_copy.get("parameters")
        if isinstance(parameters, dict) and parameters:
            section_sum = 0.0
            for param_value in parameters.values():
                score_value = _extract_numeric_score(param_value)
                if score_value is not None:
                    section_sum += score_value
            section_copy["score"] = round(section_sum, 2)
        updated_sections[section_name] = section_copy

    payload["sections"] = updated_sections
    return payload
