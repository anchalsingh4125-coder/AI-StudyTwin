import pytest
from fastapi.testclient import TestClient
from main import app
from models.diagnosis_schemas import DiagnosisRequest, DiagnosisResponse
from services.fallback_diagnosis import generate_fallback_diagnosis

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "AI StudyTwin AI Service"
    }

def test_valid_diagnose_endpoint():
    payload = {
        "overallReadinessScore": 62.5,
        "topicMastery": [
            {
                "topicId": "65b8e9f1a23c4d5e6f7a8b90",
                "topicName": "Binary Search Trees",
                "masteryScore": 82.0,
                "accuracy": 85.0,
                "attemptsCount": 5,
                "averageTimeSeconds": 24.0,
                "lastPracticed": "2026-10-08T22:00:00Z"
            },
            {
                "topicId": "65b8e9f1a23c4d5e6f7a8b91",
                "topicName": "Process Synchronization",
                "masteryScore": 32.0,
                "accuracy": 20.0,
                "attemptsCount": 4,
                "averageTimeSeconds": 85.0,
                "lastPracticed": "2026-10-08T22:30:00Z"
            }
        ],
        "repeatedMistakes": [
            {
                "mistakeType": "conceptual",
                "topicId": "65b8e9f1a23c4d5e6f7a8b91",
                "topicName": "Process Synchronization",
                "count": 3,
                "lastEncountered": "2026-10-08T22:30:00Z"
            }
        ],
        "recentQuizPerformance": [
            {
                "score": 3,
                "accuracy": 60.0,
                "totalTimeSeconds": 120,
                "completedAt": "2026-10-08T22:30:00Z"
            }
        ]
    }

    response = client.post("/diagnose", json=payload)
    assert response.status_code == 200

    data = response.json()
    # Validate against Pydantic schema
    validated = DiagnosisResponse.model_validate(data)
    assert "Process Synchronization" in validated.weakTopics
    assert "Binary Search Trees" in validated.strongTopics
    assert validated.learningRisk == "high" # due to weak topic + conceptual mistakes
    assert len(validated.repeatedErrorPatterns) >= 1
    assert len(validated.immediatePriorities) >= 1
    assert len(validated.reasoning) >= 1

def test_invalid_diagnosis_input():
    # Out of range readiness score (> 100)
    invalid_payload = {
        "overallReadinessScore": 150.0,
        "topicMastery": []
    }
    response = client.post("/diagnose", json=invalid_payload)
    assert response.status_code == 422 # Pydantic validation error

def test_deterministic_fallback_directly():
    req = DiagnosisRequest(
        overallReadinessScore=90.0,
        topicMastery=[
            {
                "topicId": "1",
                "topicName": "Arrays",
                "masteryScore": 95.0,
                "accuracy": 98.0,
                "attemptsCount": 10,
                "averageTimeSeconds": 15.0
            }
        ],
        repeatedMistakes=[],
        recentQuizPerformance=[]
    )
    res = generate_fallback_diagnosis(req)
    assert res.learningRisk == "low"
    assert "Arrays" in res.strongTopics
    assert len(res.weakTopics) == 0
    assert len(res.reasoning) >= 1
