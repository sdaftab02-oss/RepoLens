import re

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="RepoLens API")

GITHUB_REPO_PATTERN = re.compile(
    r"(?:https?://)?(?:www\.)?github\.com/(?P<owner>[^/]+)/(?P<repo>[^/#?]+)"
)


class ScanRequest(BaseModel):
    github_url: str


class ScanResponse(BaseModel):
    owner: str
    repo: str
    description: str | None = None
    stars: int = Field(ge=0)
    language: str | None = None


def parse_github_url(github_url: str) -> tuple[str, str]:
    match = GITHUB_REPO_PATTERN.match(github_url.strip())
    if not match:
        raise ValueError("Invalid GitHub repository URL")

    owner = match.group("owner")
    repo = match.group("repo").removesuffix(".git")
    return owner, repo


async def fetch_repo_stats(owner: str, repo: str) -> ScanResponse:
    api_url = f"https://api.github.com/repos/{owner}/{repo}"

    async with httpx.AsyncClient() as client:
        response = await client.get(
            api_url,
            headers={"Accept": "application/vnd.github+json"},
            timeout=10.0,
        )

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="Repository not found")
    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail="Failed to fetch repository data from GitHub",
        )

    data = response.json()
    return ScanResponse(
        owner=owner,
        repo=repo,
        description=data.get("description"),
        stars=data.get("stargazers_count", 0),
        language=data.get("language"),
    )


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/scan", response_model=ScanResponse)
async def scan_repository(request: ScanRequest):
    try:
        owner, repo = parse_github_url(request.github_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return await fetch_repo_stats(owner, repo)
