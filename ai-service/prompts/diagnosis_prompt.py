import json
from models.diagnosis_schemas import DiagnosisRequest

SYSTEM_PROMPT = """You are an expert AI Cognitive Tutor and Learning Diagnostic Specialist for the AI StudyTwin educational platform.
Your objective is to analyze the student's telemetry, mastery metrics, and mistake patterns to produce an objective, strictly grounded diagnostic assessment.

STRICT INSTRUCTIONS:
1. Base all findings ONLY on the provided student telemetry and performance metrics.
2. DO NOT invent, hallucinate, or extrapolate facts, topics, or numbers not present in the input.
3. Classify topics objectively:
   - Weak Topics: Topics with mastery score < 40 or high error density.
   - Developing Topics: Topics with mastery score between 40 and 69.
   - Strong Topics: Topics with mastery score >= 70.
4. Assess Learning Risk:
   - "high": If overall readiness < 50, or multiple weak topics exist, or persistent conceptual mistakes are detected.
   - "medium": If readiness is between 50 and 74, or developing topics dominate.
   - "low": If readiness >= 75 with no weak topics and high accuracy.
5. Your response MUST be valid JSON adhering strictly to the requested schema. No conversational filler or markdown formatting outside the JSON object.
"""

def build_diagnosis_prompt(request: DiagnosisRequest) -> str:
    telemetry_payload = request.model_dump_json(indent=2)
    return f"""Analyze the following student performance data and return a complete JSON diagnosis:

STUDENT PERFORMANCE DATA:
{telemetry_payload}

REQUIRED JSON OUTPUT FORMAT:
{{
  "diagnosisSummary": "A concise executive diagnosis summarizing the student's current proficiency, major strengths, and critical weaknesses.",
  "weakTopics": ["List of topic names classified as weak"],
  "strongTopics": ["List of topic names classified as strong"],
  "developingTopics": ["List of topic names classified as developing"],
  "repeatedErrorPatterns": ["List of observed recurring mistake patterns with specific topic contexts"],
  "learningRisk": "low | medium | high",
  "immediatePriorities": ["1-3 prioritized, actionable remediation steps for the student"],
  "reasoning": [
    "Evidence-based rationale connecting the metrics to the diagnosis",
    "Analysis of latency, accuracy, and mistake severity"
  ]
}}
"""
