import json

import httpx
import pytest
from pydantic import SecretStr

from app.providers import LLMParser
from app.schemas import initial_state
from tests.conftest import NOW, config


@pytest.mark.parametrize("invalid", [False, True])
async def test_real_langchain_adapter_validates_structured_tool_response(monkeypatch, invalid):
    # Exercise the actual LangChain/OpenAI SDK protocol, with an explicit HTTP fixture.
    # No external provider call or claim about a real model's language accuracy.
    from langchain_openai import ChatOpenAI

    seen = []
    args = {
        "intent": "search",
        "changes": [{"field": "duration_minutes", "value": 120, "evidence": "2 tiếng"}],
    }
    if invalid:
        args["userId"] = "forged"

    def transport(request):
        seen.append(json.loads(request.content))
        return httpx.Response(
            200,
            json={
                "id": "chat-fixture",
                "object": "chat.completion",
                "created": 1,
                "model": "test-model",
                "choices": [
                    {
                        "index": 0,
                        "finish_reason": "tool_calls",
                        "message": {
                            "role": "assistant",
                            "content": None,
                            "tool_calls": [
                                {
                                    "id": "call-fixture",
                                    "type": "function",
                                    "function": {
                                        "name": "ParsedMessage",
                                        "arguments": json.dumps(args),
                                    },
                                }
                            ],
                        },
                    }
                ],
                "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
            },
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(transport)) as client:
        monkeypatch.setattr(
            "langchain_openai.ChatOpenAI",
            lambda **kwargs: ChatOpenAI(**kwargs, http_async_client=client),
        )
        c = config("sqlite+aiosqlite://")
        c.llm_model, c.llm_base_url, c.llm_api_key = (
            "test-model",
            "http://model-fixture/v1",
            SecretStr("fixture-key"),
        )
        parser = LLMParser(c)
        state = {**initial_state(), "private_token": "must-not-reach-provider"}
        if invalid:
            with pytest.raises(ValueError):
                await parser.parse("Chơi 2 tiếng", state, NOW)
        else:
            parsed = await parser.parse("Chơi 2 tiếng", state, NOW)
            assert parsed.changes[0].value == 120 and parser.usage["input_tokens"] == 10
        assert seen[0]["tools"][0]["function"]["name"] == "ParsedMessage"
        assert "must-not-reach-provider" not in json.dumps(seen)
