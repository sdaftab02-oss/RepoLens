from fastapi import FastAPI

app = FastAPI(title="RepoLens API")


@app.get("/health")
def health():
    return {"status": "ok"}
