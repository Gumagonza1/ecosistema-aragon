"""
MCP Prompts Server — Ecosistema Aragón
Expone prompt primitives prediseñados para todas las funciones clave del ecosistema.

Uso:
    python server.py                    # stdio (default, para Claude Code)
    python server.py --transport sse    # SSE en puerto 8080
    python server.py --port 9000        # SSE en puerto custom
"""

import argparse
import importlib
import sys
from pathlib import Path

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    GetPromptResult,
    Prompt,
    PromptArgument,
    PromptMessage,
    TextContent,
)

# ── Cargar todos los módulos de prompts ──────────────────────────────────────

PROMPT_MODULES = [
    "prompts.fiscal",
    "prompts.whatsapp_bot",
    "prompts.api",
    "prompts.orchestrator",
    "prompts.llamadas",
    "prompts.telegram",
    "prompts.app",
    "prompts.seguridad",
]

# Registro global: name → definición completa
REGISTRY: dict[str, dict] = {}


def _load_all_prompts():
    """Carga todos los prompts de todos los módulos al registro."""
    for mod_name in PROMPT_MODULES:
        try:
            mod = importlib.import_module(mod_name)
            for p in mod.PROMPTS:
                REGISTRY[p["name"]] = p
        except ImportError as e:
            print(f"[WARN] No se pudo cargar {mod_name}: {e}", file=sys.stderr)


_load_all_prompts()


# ── Servidor MCP ─────────────────────────────────────────────────────────────

app = Server("aragon-prompts")


@app.list_prompts()
async def list_prompts() -> list[Prompt]:
    """Devuelve la lista de todos los prompts registrados."""
    result = []
    for name, defn in REGISTRY.items():
        args = []
        for a in defn.get("arguments", []):
            args.append(
                PromptArgument(
                    name=a["name"],
                    description=a.get("description", ""),
                    required=a.get("required", False),
                )
            )
        result.append(
            Prompt(
                name=name,
                description=defn.get("description", ""),
                arguments=args,
            )
        )
    return result


@app.get_prompt()
async def get_prompt(name: str, arguments: dict[str, str] | None = None) -> GetPromptResult:
    """Devuelve el prompt renderizado con los argumentos proporcionados."""
    if name not in REGISTRY:
        raise ValueError(f"Prompt '{name}' no encontrado. Disponibles: {list(REGISTRY.keys())}")

    defn = REGISTRY[name]
    args = arguments or {}

    # Renderizar el template del usuario con los argumentos
    user_template = defn.get("user_template", "")
    try:
        # Usar format_map para no fallar con argumentos faltantes
        user_text = user_template.format_map(_DefaultDict(args))
    except Exception:
        user_text = user_template

    messages = [
        PromptMessage(
            role="user",
            content=TextContent(type="text", text=defn["system"]),
        ),
        PromptMessage(
            role="user",
            content=TextContent(type="text", text=user_text),
        ),
    ]

    return GetPromptResult(
        description=defn.get("description", ""),
        messages=messages,
    )


class _DefaultDict(dict):
    """Dict que devuelve '{key}' para claves faltantes en format_map."""

    def __missing__(self, key):
        return f"{{{key}}}"


# ── Main ─────────────────────────────────────────────────────────────────────


async def main_stdio():
    """Ejecuta el servidor en modo stdio."""
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())


async def main_sse(port: int):
    """Ejecuta el servidor en modo SSE."""
    from mcp.server.sse import SseServerTransport
    from starlette.applications import Starlette
    from starlette.routing import Route
    import uvicorn

    sse = SseServerTransport("/messages")

    async def handle_sse(request):
        async with sse.connect_sse(
            request.scope, request.receive, request._send
        ) as streams:
            await app.run(streams[0], streams[1], app.create_initialization_options())

    starlette_app = Starlette(
        routes=[
            Route("/sse", endpoint=handle_sse),
            Route("/messages", endpoint=sse.handle_post_message, methods=["POST"]),
        ]
    )
    config = uvicorn.Config(starlette_app, host="0.0.0.0", port=port)
    server = uvicorn.Server(config)
    await server.serve()


if __name__ == "__main__":
    import asyncio

    parser = argparse.ArgumentParser(description="MCP Prompts Server — Ecosistema Aragón")
    parser.add_argument("--transport", choices=["stdio", "sse"], default="stdio")
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()

    print(f"[aragon-prompts] {len(REGISTRY)} prompts cargados", file=sys.stderr)
    print(f"[aragon-prompts] Transporte: {args.transport}", file=sys.stderr)

    if args.transport == "sse":
        asyncio.run(main_sse(args.port))
    else:
        asyncio.run(main_stdio())
