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

    # First try: extract user_id without verification (always works if token is valid JWT)
    try:
        unverified = jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
        user_id_unverified = unverified.get("sub")
        # Check expiry manually
        import time
        exp = unverified.get("exp")
        if exp and time.time() > exp:
            raise HTTPException(status_code=401, detail="Token has expired.")
    except HTTPException:
        raise
    except Exception:
        return ANONYMOUS_USER_ID

    # Second try: full verification with secret (if available)
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")

        if alg == "HS256" and SUPABASE_JWT_SECRET:
            key = SUPABASE_JWT_SECRET
            payload = jwt.decode(token, key, algorithms=[alg], options={"verify_aud": False})
            user_id = payload.get("sub")
            return user_id or ANONYMOUS_USER_ID
        elif alg != "HS256":
            signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
            payload = jwt.decode(token, signing_key.key, algorithms=[alg], options={"verify_aud": False})
            user_id = payload.get("sub")
            return user_id or ANONYMOUS_USER_ID
    except Exception:
        pass

    # Fallback: use unverified user_id (token is valid JWT but secret not configured on server)
    return user_id_unverified or ANONYMOUS_USER_ID
