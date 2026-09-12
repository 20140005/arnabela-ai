from fastapi import FastAPI

app = FastAPI(
    title="Customer Lab API",
    description="AI-powered customer simulation platform",
    version="0.1.0",
)


@app.get("/")
def root():
    return {
        "message": "Welcome to Customer Lab API",
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }