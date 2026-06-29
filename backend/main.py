import base64
import re

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="RepoLens API")

GITHUB_API_BASE = "https://api.github.com"

GITHUB_REPO_PATTERN = re.compile(
    r"(?:https?://)?(?:www\.)?github\.com/(?P<owner>[^/]+)/(?P<repo>[^/#?]+)"
)

PROJECT_SUMMARY_LIMIT = 500

# Maps a marker file/folder name to the technology it implies.
TECH_STACK_MARKERS: dict[str, str] = {
    "package.json": "Node.js",
    "yarn.lock": "Node.js",
    "pnpm-lock.yaml": "Node.js",
    "tsconfig.json": "TypeScript",
    "next.config.js": "Next.js",
    "next.config.ts": "Next.js",
    "next.config.mjs": "Next.js",
    "requirements.txt": "Python",
    "setup.py": "Python",
    "pyproject.toml": "Python",
    "Pipfile": "Python",
    "go.mod": "Go",
    "cargo.toml": "Rust",
    "gemfile": "Ruby",
    "composer.json": "PHP",
    "pom.xml": "Java",
    "build.gradle": "Java",
    "build.gradle.kts": "Kotlin",
    "pubspec.yaml": "Dart",
    "dockerfile": "Docker",
    "docker-compose.yml": "Docker",
    "docker-compose.yaml": "Docker",
}


class ScanRequest(BaseModel):
    github_url: str


class ScanResponse(BaseModel):
    owner: str
    repo: str
    description: str | None = None
    stars: int = Field(ge=0)
    language: str | None = None


class PassportRequest(BaseModel):
    github_url: str


class CodebasePassport(BaseModel):
    project_summary: str
    file_tree: list[str]
    tech_stack: list[str]


def parse_github_url(github_url: str) -> tuple[str, str]:
    match = GITHUB_REPO_PATTERN.match(github_url.strip())
    if not match:
        raise ValueError("Invalid GitHub repository URL")

    owner = match.group("owner")
    repo = match.group("repo").removesuffix(".git")
    return owner, repo


async def fetch_repo_stats(owner: str, repo: str) -> ScanResponse:
    api_url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}"

    async with httpx.AsyncClient(follow_redirects=True) as client:
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


async def fetch_root_tree(client: httpx.AsyncClient, owner: str, repo: str) -> list[dict]:
    response = await client.get(
        f"{GITHUB_API_BASE}/repos/{owner}/{repo}/contents",
        headers={"Accept": "application/vnd.github+json"},
        timeout=10.0,
    )

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="Repository not found")
    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail="Failed to fetch repository file tree from GitHub",
        )

    data = response.json()
    if not isinstance(data, list):
        raise HTTPException(
            status_code=502,
            detail="Unexpected response when fetching repository file tree",
        )
    return data


async def fetch_readme(client: httpx.AsyncClient, owner: str, repo: str) -> str:
    response = await client.get(
        f"{GITHUB_API_BASE}/repos/{owner}/{repo}/readme",
        headers={"Accept": "application/vnd.github+json"},
        timeout=10.0,
    )

    if response.status_code == 404:
        return ""
    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail="Failed to fetch repository README from GitHub",
        )

    data = response.json()
    encoded = data.get("content", "")
    if data.get("encoding") == "base64" and encoded:
        try:
            return base64.b64decode(encoded).decode("utf-8", errors="replace")
        except ValueError:
            return ""
    return ""


def guess_tech_stack(file_names: list[str]) -> list[str]:
    lowercased = {name.lower() for name in file_names}
    detected: list[str] = []
    for marker, tech in TECH_STACK_MARKERS.items():
        if marker in lowercased and tech not in detected:
            detected.append(tech)
    return detected


async def build_passport(owner: str, repo: str) -> CodebasePassport:
    async with httpx.AsyncClient(follow_redirects=True) as client:
        tree = await fetch_root_tree(client, owner, repo)
        readme = await fetch_readme(client, owner, repo)

    file_tree = [item.get("name", "") for item in tree if item.get("name")]
    project_summary = readme.strip()[:PROJECT_SUMMARY_LIMIT]

    return CodebasePassport(
        project_summary=project_summary,
        file_tree=file_tree,
        tech_stack=guess_tech_stack(file_tree),
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


@app.post("/passport", response_model=CodebasePassport)
async def codebase_passport(request: PassportRequest):
    try:
        owner, repo = parse_github_url(request.github_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return await build_passport(owner, repo)
