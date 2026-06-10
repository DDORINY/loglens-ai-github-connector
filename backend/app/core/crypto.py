from cryptography.fernet import Fernet

from app.core.config import settings


def get_fernet() -> Fernet:
    return Fernet(settings.GITHUB_TOKEN_ENCRYPTION_KEY.encode())


def encrypt_text(value: str) -> str:
    return get_fernet().encrypt(value.encode()).decode()


def decrypt_text(value: str) -> str:
    return get_fernet().decrypt(value.encode()).decode()
