import jwt
from jwt import PyJWKClient
from fastapi import Request, HTTPException

from config import SUPABASE_URL, SUPABASE_JWT_SECRET

ANONYMOUS_USER_ID = "anonymous"

_jwks_client = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client


async def get_current_user(request: Request) -> str:
    """FastAPI dependency: returns user ID from JWT, or 'anonymous' if no token."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return ANONYMOUS_USER_ID

    token = auth_header.split(" ", 1)[1]
    if not token:
        return ANONYMOUS_USER_ID

    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")

        if alg == "HS256":
            if not SUPABASE_JWT_SECRET:
                return ANONYMOUS_USER_ID
            key = SUPABASE_JWT_SECRET
        else:
            signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
            key = signing_key.key

        payload = jwt.decode(
            token,
            key,
            algorithms=[alg],
            options={"verify_aud": False},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired.")
    except jwt.InvalidTokenError:
        return ANONYMOUS_USER_ID

    user_id = payload.get("sub")
    return user_id or ANONYMOUS_USER_ID
        return ANONYMOUS_USER_ID

    user_id = payload.get("sub")
    return user_id or ANONYMOUS_USER_ID
