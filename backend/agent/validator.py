"""
AI Validator Agent — soTives
Analiza evidencia y determina si un compromiso fue cumplido.
Soporta: GitHub repos/commits, URLs, archivos, posts de X.
"""

import httpx
import base64
from enum import Enum
from typing import Optional
from pydantic import BaseModel
from openai import AsyncOpenAI
from github import Github, GithubException

from config import settings


class EvidenceType(str, Enum):
    GITHUB_REPO = "github_repo"
    GITHUB_COMMIT = "github_commit"
    GITHUB_PR = "github_pr"
    URL = "url"
    FILE = "file"
    TWITTER_POST = "twitter_post"
    TEXT = "text"


class ValidationResult(BaseModel):
    commitment_id: int
    fulfilled: bool
    confidence: float  # 0.0 a 1.0
    reasoning: str
    evidence_summary: str
    raw_evidence: Optional[str] = None


class ValidatorAgent:
    def __init__(self):
        self.llm = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        # Sin token: funciona para repos públicos con límite de 60 req/hora.
        # Con token: 5000 req/hora. Ambos casos están soportados.
        self.github = Github(settings.GITHUB_TOKEN) if settings.GITHUB_TOKEN else Github()

    async def validate(
        self,
        commitment_id: int,
        goal: str,
        criteria: str,
        evidence_type: EvidenceType,
        evidence_value: str,
    ) -> ValidationResult:
        """Punto de entrada principal. Extrae la evidencia y llama al LLM."""
        raw_evidence = await self._extract_evidence(evidence_type, evidence_value)

        prompt = self._build_prompt(goal, criteria, evidence_type, evidence_value, raw_evidence)
        response = await self.llm.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Eres un árbitro neutral de compromisos. Tu único trabajo es analizar "
                        "evidencia y determinar de forma objetiva si un compromiso fue cumplido. "
                        "Responde SIEMPRE en JSON con este formato exacto:\n"
                        '{"fulfilled": true/false, "confidence": 0.0-1.0, '
                        '"reasoning": "explicación breve", "evidence_summary": "resumen de evidencia"}'
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0,
        )

        import json
        data = json.loads(response.choices[0].message.content)

        return ValidationResult(
            commitment_id=commitment_id,
            fulfilled=data["fulfilled"],
            confidence=data["confidence"],
            reasoning=data["reasoning"],
            evidence_summary=data["evidence_summary"],
            raw_evidence=raw_evidence[:2000] if raw_evidence else None,
        )

    async def _extract_evidence(self, evidence_type: EvidenceType, value: str) -> str:
        """Extrae contenido legible según el tipo de evidencia."""
        try:
            if evidence_type == EvidenceType.GITHUB_REPO:
                return await self._extract_github_repo(value)
            elif evidence_type == EvidenceType.GITHUB_COMMIT:
                return await self._extract_github_commit(value)
            elif evidence_type == EvidenceType.GITHUB_PR:
                return await self._extract_github_pr(value)
            elif evidence_type == EvidenceType.URL:
                return await self._fetch_url(value)
            elif evidence_type == EvidenceType.TWITTER_POST:
                return await self._extract_tweet(value)
            elif evidence_type == EvidenceType.TEXT:
                return value
            elif evidence_type == EvidenceType.FILE:
                # El valor es base64 del archivo
                return base64.b64decode(value).decode("utf-8", errors="replace")[:3000]
        except Exception as e:
            return f"[Error extrayendo evidencia: {str(e)}]"
        return value

    async def _extract_github_repo(self, url: str) -> str:
        """Extrae info de un repo GitHub: descripción, README, commits recientes."""
        if not self.github:
            return await self._fetch_url(url)

        # Parsear owner/repo de la URL
        parts = url.rstrip("/").split("github.com/")
        if len(parts) < 2:
            return await self._fetch_url(url)

        repo_path = parts[1].split("/")[:2]
        if len(repo_path) < 2:
            return await self._fetch_url(url)

        try:
            repo = self.github.get_repo(f"{repo_path[0]}/{repo_path[1]}")
            commits = list(repo.get_commits()[:5])
            commit_msgs = "\n".join(
                f"- [{c.sha[:7]}] {c.commit.message.split(chr(10))[0]} ({c.commit.author.date})"
                for c in commits
            )
            try:
                readme = repo.get_readme().decoded_content.decode("utf-8")[:1000]
            except Exception:
                readme = "(sin README)"

            return (
                f"Repo: {repo.full_name}\n"
                f"Descripción: {repo.description}\n"
                f"Última actualización: {repo.updated_at}\n"
                f"Stars: {repo.stargazers_count} | Forks: {repo.forks_count}\n"
                f"Lenguaje principal: {repo.language}\n\n"
                f"README (primeros 1000 chars):\n{readme}\n\n"
                f"Commits recientes:\n{commit_msgs}"
            )
        except GithubException as e:
            return f"GitHub API error: {e.data}"

    async def _extract_github_commit(self, url: str) -> str:
        """Extrae info de un commit específico."""
        if not self.github:
            return await self._fetch_url(url)

        # URL: github.com/owner/repo/commit/sha
        try:
            parts = url.split("github.com/")[1].split("/")
            owner, repo_name, _, sha = parts[0], parts[1], parts[2], parts[3]
            repo = self.github.get_repo(f"{owner}/{repo_name}")
            commit = repo.get_commit(sha)
            files_changed = "\n".join(
                f"  {f.filename} (+{f.additions}/-{f.deletions})"
                for f in commit.files[:10]
            )
            return (
                f"Commit: {sha[:7]}\n"
                f"Autor: {commit.commit.author.name}\n"
                f"Fecha: {commit.commit.author.date}\n"
                f"Mensaje: {commit.commit.message}\n\n"
                f"Archivos modificados:\n{files_changed}"
            )
        except Exception as e:
            return await self._fetch_url(url)

    async def _extract_github_pr(self, url: str) -> str:
        """Extrae info de un Pull Request."""
        if not self.github:
            return await self._fetch_url(url)

        try:
            parts = url.split("github.com/")[1].split("/")
            owner, repo_name, pr_number = parts[0], parts[1], int(parts[3])
            repo = self.github.get_repo(f"{owner}/{repo_name}")
            pr = repo.get_pull(pr_number)
            return (
                f"PR #{pr.number}: {pr.title}\n"
                f"Estado: {pr.state} | Merged: {pr.merged}\n"
                f"Autor: {pr.user.login}\n"
                f"Creado: {pr.created_at} | Cerrado: {pr.closed_at}\n"
                f"Archivos: {pr.changed_files} | +{pr.additions}/-{pr.deletions}\n\n"
                f"Descripción:\n{pr.body[:1000] if pr.body else '(sin descripción)'}"
            )
        except Exception:
            return await self._fetch_url(url)

    async def _fetch_url(self, url: str) -> str:
        """Fetch simple de una URL, extrae texto plano."""
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            r = await client.get(url, headers={"User-Agent": "soTives-validator/1.0"})
            content_type = r.headers.get("content-type", "")
            if "text" in content_type or "json" in content_type:
                return r.text[:3000]
            return f"[Contenido binario, status {r.status_code}, content-type: {content_type}]"

    async def _extract_tweet(self, url_or_id: str) -> str:
        """Extrae texto de un tweet via la URL pública."""
        tweet_id = url_or_id.rstrip("/").split("/")[-1].split("?")[0]
        bearer = settings.TWITTER_BEARER_TOKEN
        if not bearer:
            return f"Twitter no configurado. URL: {url_or_id}"

        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"https://api.twitter.com/2/tweets/{tweet_id}",
                params={"tweet.fields": "created_at,author_id,text"},
                headers={"Authorization": f"Bearer {bearer}"},
            )
            if r.status_code == 200:
                data = r.json().get("data", {})
                return f"Tweet [{tweet_id}]:\n{data.get('text', '')}\nFecha: {data.get('created_at', '')}"
            return f"No se pudo obtener el tweet (status {r.status_code})"

    def _build_prompt(
        self,
        goal: str,
        criteria: str,
        evidence_type: EvidenceType,
        evidence_value: str,
        raw_evidence: str,
    ) -> str:
        return f"""
COMPROMISO:
Objetivo: {goal}
Criterios de éxito: {criteria}

EVIDENCIA PRESENTADA:
Tipo: {evidence_type}
Referencia: {evidence_value}

Contenido extraído de la evidencia:
---
{raw_evidence}
---

Analizá si la evidencia demuestra de forma objetiva que el objetivo fue cumplido según los criterios definidos.
Considerá:
- ¿La evidencia es real y verificable?
- ¿Se alinea con los criterios definidos?
- ¿Hay señales de que el trabajo fue completado (no solo iniciado)?
- ¿La fecha de la evidencia es posterior a la creación del compromiso?

Sé estricto pero justo. Si la evidencia es ambigua, reflejá eso en el confidence.
"""
