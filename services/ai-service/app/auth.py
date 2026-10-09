from dataclasses import dataclass

import jwt
from fastapi import HTTPException


@dataclass(frozen=True)
class Actor:
    user_id: str
    role: str
    name: str
    loyalty_points: int = 0


def verify_actor(token: str, config) -> Actor:
    try:
        d = jwt.decode(
            token,
            config.jwt_secret.get_secret_value(),
            algorithms=["HS256"],
            issuer=config.jwt_issuer,
            audience=config.jwt_audience,
            options={"require": ["sub", "exp", "iss", "aud"]},
        )
        sub, role, points = d.get("sub"), d.get("role"), d.get("loyaltyPoints", 0)
        if (
            not isinstance(sub, str)
            or not 1 <= len(sub) <= 128
            or role not in {"user", "center_manager", "super_admin"}
            or type(points) is not int
            or points < 0
            or type(d["exp"]) not in {int, float}
        ):
            raise ValueError("Invalid actor")
        name = d.get("name", sub)
        return Actor(sub, role, name[:150] if isinstance(name, str) else sub, points)
    except (jwt.PyJWTError, ValueError, TypeError):
        raise HTTPException(401, "Danh tính không hợp lệ") from None
