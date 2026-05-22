from __future__ import annotations

import re
from dataclasses import dataclass
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import httpx


USER_AGENT = "RushIntelBot/0.1 (+public-source-review)"

RECRUITMENT_KEYWORDS = {
    "incoming",
    "freshman",
    "first-year",
    "orientation",
    "move-in",
    "admitted",
    "committed",
    "washburn",
    "ichabod",
    "class of",
    "roster",
}

SENSITIVE_TERMS = {
    "home address",
    "medical condition",
    "license plate",
    "date of birth",
    "birthdate",
    "ssn",
    "password",
    "private message",
    "hidden channel",
    "token",
    "cookie",
    "credential",
}

NAME_BLOCKLIST = {
    "Washburn University",
    "Public Web",
    "Instagram",
    "TikTok",
    "LinkedIn",
    "Reddit",
    "Discord",
    "Incoming Freshman",
    "Move In",
}


@dataclass(frozen=True)
class ExtractedCandidate:
    display_name: str | None
    handle: str | None
    evidence: str
    rationale: str
    confidence_score: int


@dataclass(frozen=True)
class FetchResult:
    robots_allowed: bool
    http_status: int | None
    text: str
    error: str | None = None


class TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._skip_depth = 0
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in {"script", "style", "noscript"}:
            self._skip_depth += 1
        if tag in {"p", "li", "tr", "div", "br", "section", "article"}:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "noscript"} and self._skip_depth > 0:
            self._skip_depth -= 1
        if tag in {"p", "li", "tr", "div", "section", "article"}:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self._skip_depth == 0:
            self.parts.append(data)

    def text(self) -> str:
        return re.sub(r"[ \t]+", " ", "".join(self.parts))


def html_to_text(html: str) -> str:
    parser = TextExtractor()
    parser.feed(html)
    return parser.text()


def split_evidence_lines(text: str) -> list[str]:
    lines = re.split(r"[\n\r]+", text)
    return [re.sub(r"\s+", " ", line).strip() for line in lines if line.strip()]


def contains_recruitment_signal(line: str) -> bool:
    lowered = line.lower()
    return any(keyword in lowered for keyword in RECRUITMENT_KEYWORDS)


def contains_sensitive_signal(line: str) -> bool:
    lowered = line.lower()
    return any(term in lowered for term in SENSITIVE_TERMS)


def extract_handle(line: str) -> str | None:
    match = re.search(r"@[A-Za-z0-9_.]{2,30}", line)
    return match.group(0).rstrip("._") if match else None


def extract_name(line: str) -> str | None:
    for match in re.finditer(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b", line):
        candidate = match.group(1).strip()
        if candidate in NAME_BLOCKLIST:
            continue
        if any(part.lower() in {"university", "orientation", "instagram"} for part in candidate.split()):
            continue
        return candidate
    return None


def score_candidate(line: str, display_name: str | None, handle: str | None) -> int:
    lowered = line.lower()
    score = 48
    score += min(24, sum(1 for keyword in RECRUITMENT_KEYWORDS if keyword in lowered) * 6)
    if display_name:
        score += 14
    if handle:
        score += 8
    return max(0, min(score, 95))


def extract_candidates_from_html(html: str) -> list[ExtractedCandidate]:
    text = html_to_text(html)
    candidates: list[ExtractedCandidate] = []
    seen: set[tuple[str | None, str | None, str]] = set()

    for line in split_evidence_lines(text):
        if not contains_recruitment_signal(line) or contains_sensitive_signal(line):
            continue
        display_name = extract_name(line)
        handle = extract_handle(line)
        if display_name is None and handle is None:
            continue
        evidence = line[:500]
        key = (display_name, handle, evidence.lower())
        if key in seen:
            continue
        seen.add(key)
        rationale_bits = ["public page matched recruitment context"]
        if display_name:
            rationale_bits.append("person-like name found")
        if handle:
            rationale_bits.append("public handle found")
        candidates.append(
            ExtractedCandidate(
                display_name=display_name,
                handle=handle,
                evidence=evidence,
                rationale="; ".join(rationale_bits),
                confidence_score=score_candidate(line, display_name, handle),
            )
        )

    return candidates


def validate_public_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Discovery source URL must be an HTTP or HTTPS public URL.")
    if parsed.username or parsed.password:
        raise ValueError("Discovery source URL must not include credentials.")


def robots_url_for(url: str) -> str:
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}/robots.txt"


def fetch_public_page(url: str, robots_check_required: bool = True) -> FetchResult:
    validate_public_url(url)
    headers = {"User-Agent": USER_AGENT}
    try:
        with httpx.Client(timeout=8, follow_redirects=True, headers=headers) as client:
            robots_allowed = True
            if robots_check_required:
                robots_response = client.get(robots_url_for(url))
                if robots_response.status_code < 400:
                    parser = RobotFileParser()
                    parser.set_url(robots_url_for(url))
                    parser.parse(robots_response.text.splitlines())
                    robots_allowed = parser.can_fetch(USER_AGENT, url)
                else:
                    robots_allowed = True
                if not robots_allowed:
                    return FetchResult(
                        robots_allowed=False,
                        http_status=None,
                        text="",
                        error="robots.txt disallows collection for this source.",
                    )
            response = client.get(url)
            content_type = response.headers.get("content-type", "")
            if "text/html" not in content_type and "text/plain" not in content_type:
                return FetchResult(
                    robots_allowed=robots_allowed,
                    http_status=response.status_code,
                    text="",
                    error="Source is not an HTML or text page.",
                )
            return FetchResult(
                robots_allowed=robots_allowed,
                http_status=response.status_code,
                text=response.text if response.is_success else "",
                error=None if response.is_success else f"HTTP {response.status_code}",
            )
    except httpx.HTTPError as error:
        return FetchResult(
            robots_allowed=False,
            http_status=None,
            text="",
            error=f"Fetch failed: {error}",
        )
