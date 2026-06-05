from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    database_url: str = "sqlite:///./data/linkvault.db"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
