from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI


load_dotenv(Path(__file__).with_name(".env"))

app = FastAPI(
    title="Ágora electoral API",
    description="Servidor local del asistente sobre documentación electoral.",
    version="0.1.0",
)


@app.get("/api/health", tags=["Sistema"])
def health() -> dict[str, str]:
    """Comprueba que la API está disponible, sin consultar servicios externos."""
    return {"status": "ok", "service": "agora-electoral-api"}
