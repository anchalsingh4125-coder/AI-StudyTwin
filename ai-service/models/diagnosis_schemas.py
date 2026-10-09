from typing import List, Optional, Literal
from pydantic import BaseModel, Field

class TopicMasteryInput(BaseModel):
    topicId: str
    topicName: str
    masteryScore: float = Field(ge=0.0, le=100.0, description="Mastery score between 0 and 100")
    accuracy: float = Field(ge=0.0, le=100.0, description="Accuracy percentage between 0 and 100")
    attemptsCount: int = Field(ge=0, description="Number of attempted questions")
    averageTimeSeconds: float = Field(ge=0.0, description="Average response latency in seconds")
    lastPracticed: Optional[str] = None

class RepeatedMistakeInput(BaseModel):
    mistakeType: str
    topicId: str
    topicName: Optional[str] = None
    count: int = Field(ge=1, description="Number of occurrences")
    lastEncountered: Optional[str] = None

class RecentQuizInput(BaseModel):
    score: int = Field(ge=0)
    accuracy: float = Field(ge=0.0, le=100.0)
    totalTimeSeconds: int = Field(ge=0)
    completedAt: Optional[str] = None

class DiagnosisRequest(BaseModel):
    overallReadinessScore: float = Field(ge=0.0, le=100.0, description="Overall exam readiness score")
    topicMastery: List[TopicMasteryInput] = Field(default_factory=list)
    repeatedMistakes: List[RepeatedMistakeInput] = Field(default_factory=list)
    recentQuizPerformance: List[RecentQuizInput] = Field(default_factory=list)

class DiagnosisResponse(BaseModel):
    diagnosisSummary: str = Field(description="Executive summary of the student's cognitive state")
    weakTopics: List[str] = Field(default_factory=list, description="Topics requiring urgent intervention")
    strongTopics: List[str] = Field(default_factory=list, description="Topics demonstrating stable mastery")
    developingTopics: List[str] = Field(default_factory=list, description="Topics in intermediate proficiency")
    repeatedErrorPatterns: List[str] = Field(default_factory=list, description="Consistently occurring mistake patterns")
    learningRisk: Literal["low", "medium", "high"] = Field(description="Cognitive and exam vulnerability level")
    immediatePriorities: List[str] = Field(default_factory=list, description="Actionable immediate remediation focus")
    reasoning: List[str] = Field(default_factory=list, description="Data-driven pedagogical rationale")
