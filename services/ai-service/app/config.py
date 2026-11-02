from functools import lru_cache
from typing import Literal
from urllib.parse import urlparse

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    ai_database_url: str = "postgresql+psycopg://ai:ai_dev@localhost:5433/ai"
    booking_core_url: str = "http://localhost:3000"
    jwt_secret: SecretStr = SecretStr("")
    jwt_issuer: str = "badminton-identity"
    jwt_audience: str = "badminton-system"
    metrics_token: SecretStr = SecretStr("")
    app_env: Literal["development", "test", "production"] = "development"
    ai_provider: str = "openai-compatible"
    ai_offline: bool = False
    llm_api_key: SecretStr = SecretStr("")
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4.1-mini"
    llm_timeout_seconds: int = 25
    core_timeout_seconds: int = 5
    max_search_centers: int = 5
    max_options: int = 5
    confirmation_ttl_seconds: int = 600
    proposal_ttl_seconds: int = 300
    max_candidates: int = 500
    max_discovery_pages: int = 2
    search_concurrency: int = 2
    search_timeout_seconds: int = 10
    availability_max_age_seconds: int = 60
    near_miss_time_minutes: int = 60
    near_miss_price_ratio: float = 0.2
    near_miss_top_k: int = 3
    near_miss_weights: dict[str, float] = {"time": 0.4, "price": 0.4, "area": 0.2}
    nearby_areas: dict[str, list[str]] = {}

    @model_validator(mode="after")
    def valid(self):
        if len(self.jwt_secret.get_secret_value()) < 32:
            raise ValueError("JWT_SECRET needs 32 characters")
        u = urlparse(self.booking_core_url)
        if (
            u.scheme not in {"http", "https"}
            or not u.netloc
            or u.username
            or u.password
            or u.path not in {"", "/"}
            or u.query
            or u.fragment
        ):
            raise ValueError("BOOKING_CORE_URL must be an HTTP origin")
        self.booking_core_url = self.booking_core_url.rstrip("/")
        if self.ai_provider not in {"fake", "openai-compatible"}:
            raise ValueError("Invalid AI_PROVIDER")
        if self.ai_offline != (self.ai_provider == "fake"):
            raise ValueError("Fake provider requires AI_OFFLINE=true; real provider requires false")
        if self.app_env == "production" and (
            self.ai_provider == "fake"
            or "local-development" in self.jwt_secret.get_secret_value()
            or not self.metrics_token.get_secret_value()
            or not self.ai_database_url.startswith("postgresql+psycopg://")
        ):
            raise ValueError(
                "Production needs real provider, PostgreSQL, private JWT/metrics secrets"
            )
        if self.ai_provider != "fake" and not self.llm_api_key.get_secret_value():
            raise ValueError("LLM_API_KEY required")
        if not 1 <= self.max_search_centers <= 10 or not 1 <= self.max_options <= 10:
            raise ValueError("Invalid search bounds")
        if not 1 <= self.core_timeout_seconds <= 10 or not 1 <= self.llm_timeout_seconds <= 30:
            raise ValueError("Timeouts must fit the gateway request budget")
        if not 60 <= self.confirmation_ttl_seconds <= 1800:
            raise ValueError("Confirmation lifetime must be 60..1800 seconds")
        if not 30 <= self.proposal_ttl_seconds <= 600:
            raise ValueError("Proposal lifetime must be 30..600 seconds")
        if not 1 <= self.max_candidates <= 2000 or not 1 <= self.near_miss_top_k <= 10:
            raise ValueError("Invalid candidate/proposal bounds")
        if not 1 <= self.max_discovery_pages <= 5 or not 1 <= self.search_concurrency <= 4:
            raise ValueError("Invalid discovery/concurrency bounds")
        if not 1 <= self.search_timeout_seconds <= 12:
            raise ValueError("Search must fit the gateway turn budget")
        if not 1 <= self.availability_max_age_seconds <= 300:
            raise ValueError("Invalid availability freshness policy")
        if (
            not 0 <= self.near_miss_time_minutes <= 120
            or not 0 <= self.near_miss_price_ratio <= 0.5
        ):
            raise ValueError("Invalid near-miss thresholds")
        if set(self.near_miss_weights) != {"time", "price", "area"} or (
            any(not 0 <= v <= 1 for v in self.near_miss_weights.values())
            or abs(sum(self.near_miss_weights.values()) - 1) > 0.000001
        ):
            raise ValueError("Ranking weights must be non-negative and sum to one")
        if len(self.nearby_areas) > 50 or any(len(v) > 10 for v in self.nearby_areas.values()):
            raise ValueError("Area adjacency must be explicitly bounded")
        if any(
            not name.strip() or len(name) > 100
            for origin, adjacent in self.nearby_areas.items()
            for name in [origin, *adjacent]
        ):
            raise ValueError("Area names must be nonblank and at most 100 characters")
        model_url = urlparse(self.llm_base_url)
        if (
            model_url.scheme not in {"http", "https"}
            or not model_url.netloc
            or model_url.username
            or model_url.password
            or model_url.query
            or model_url.fragment
        ):
            raise ValueError("LLM_BASE_URL needs an HTTP endpoint without embedded credentials")
        return self

    @property
    def checkpoint_url(self):
        return self.ai_database_url.replace("postgresql+psycopg://", "postgresql://", 1)


@lru_cache
def settings():
    return Settings()
