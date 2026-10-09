import os
from dotenv import load_dotenv
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from models.diagnosis_schemas import DiagnosisRequest, DiagnosisResponse
from services.llm_service import llm_service

load_dotenv()

app = FastAPI(
    title="AI StudyTwin AI Service",
    description="Cognitive modeling and AI diagnostic microservice",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    return {
        "status": "ok",
        "service": "AI StudyTwin AI Service"
    }

@app.post("/diagnose", response_model=DiagnosisResponse, status_code=status.HTTP_200_OK)
async def diagnose(request: DiagnosisRequest):
    """
    Produce a structured pedagogical diagnosis of a student's cognitive learning state.
    Utilizes LLM inference when configured, with seamless deterministic fallback.
    """
    return await llm_service.diagnose_student(request)

@app.get("/")
def root():
    return {
        "service": "AI StudyTwin AI Microservice",
        "docs": "/docs",
        "health": "/health",
        "diagnose": "/diagnose"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "127.0.0.1")
    uvicorn.run("main:app", host=host, port=port, reload=True)
