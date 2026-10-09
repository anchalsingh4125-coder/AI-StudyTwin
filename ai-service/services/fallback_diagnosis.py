from models.diagnosis_schemas import DiagnosisRequest, DiagnosisResponse

def generate_fallback_diagnosis(request: DiagnosisRequest) -> DiagnosisResponse:
    """
    Generate a deterministic, rule-based fallback diagnosis when LLM API is unavailable.
    Guarantees strict compliance with the DiagnosisResponse Pydantic schema.
    """
    weak_topics = []
    developing_topics = []
    strong_topics = []

    for topic in request.topicMastery:
        name = topic.topicName or f"Topic {topic.topicId}"
        if topic.masteryScore < 40:
            weak_topics.append(name)
        elif topic.masteryScore < 70:
            developing_topics.append(name)
        else:
            strong_topics.append(name)

    # Format repeated error patterns
    repeated_patterns = []
    for m in request.repeatedMistakes:
        topic_desc = m.topicName or f"Topic {m.topicId}"
        repeated_patterns.append(
            f"{m.count} {m.mistakeType} error{'s' if m.count > 1 else ''} recorded on {topic_desc}"
        )

    # Evaluate learning risk
    readiness = request.overallReadinessScore
    if readiness < 50 or len(weak_topics) > 0:
        learning_risk = "high"
    elif readiness < 75 or len(developing_topics) > 0:
        learning_risk = "medium"
    else:
        learning_risk = "low"

    # Construct diagnosis summary
    if len(weak_topics) > 0:
        summary = (
            f"Student demonstrates critical knowledge gaps in {', '.join(weak_topics)} "
            f"with an overall readiness score of {readiness}%. Immediate remedial review is required."
        )
    elif len(developing_topics) > 0:
        summary = (
            f"Student is progressing steadily with developing mastery in {', '.join(developing_topics)}. "
            f"Overall readiness score is {readiness}%."
        )
    elif len(strong_topics) > 0:
        summary = (
            f"Student exhibits strong mastery across practiced topics ({', '.join(strong_topics)}) "
            f"with high readiness ({readiness}%)."
        )
    else:
        summary = f"Initial learning profile initialized. Overall baseline readiness stands at {readiness}%."

    # Immediate priorities
    priorities = []
    if weak_topics:
        priorities.append(f"Conduct conceptual review of high-vulnerability topics: {', '.join(weak_topics)}")
    if repeated_patterns:
        priorities.append(f"Address identified error patterns: {repeated_patterns[0]}")
    if developing_topics:
        priorities.append(f"Reinforce practice on developing topics: {', '.join(developing_topics)}")
    if not priorities:
        priorities.append("Take diagnostic quizzes across core curriculum subjects to establish mastery baselines")

    # Reasoning bullets
    reasoning = [
      f"Overall readiness score is {readiness}%, corresponding to a {learning_risk}-risk cognitive tier.",
      f"Curriculum analysis identified {len(strong_topics)} strong, {len(developing_topics)} developing, and {len(weak_topics)} weak topics.",
    ]
    if repeated_patterns:
      reasoning.append(f"Identified {len(repeated_patterns)} recurrent misconception clusters requiring intervention.")
    if request.recentQuizPerformance:
      avg_recent_acc = sum(q.accuracy for q in request.recentQuizPerformance) / len(request.recentQuizPerformance)
      reasoning.append(f"Recent quiz performance exhibits an average accuracy of {round(avg_recent_acc, 1)}%.")

    return DiagnosisResponse(
        diagnosisSummary=summary,
        weakTopics=weak_topics,
        strongTopics=strong_topics,
        developingTopics=developing_topics,
        repeatedErrorPatterns=repeated_patterns,
        learningRisk=learning_risk,
        immediatePriorities=priorities[:3],
        reasoning=reasoning,
    )
