# OpenHive AI

Plataforma open-source de criacao e gestao de conteudo para redes sociais com IA.

## Features

- **Posts** - Crie, edite e agende posts com legendas e imagens geradas por IA
- **Calendario** - Visualizacao de agendamentos em calendario
- **Tarefas** - Gerencie gravacoes e publicacoes com prioridades e prazos
- **Projetos** - Organize conteudo em projetos com modulos
- **Funis de Vendas** - Construtor visual com React Flow (arrastar, conectar, CRUD inline)
- **YouTube Clips** - Extraia melhores momentos de videos do YouTube em clips verticais com face cam e legendas
- **Telegram Bot** - Crie e gerencie posts direto do Telegram
- **MCP Server** - 24 tools de IA para Claude Code, Claude Desktop e Cowork
- **Equipe** - Convide membros com permissoes por pagina (Owner, Admin, Editor, Viewer)

## Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| API | Express + Prisma + BullMQ |
| Web | Next.js 14 + Tailwind CSS |
| Bot | Grammy.js (Telegram) |
| MCP | @modelcontextprotocol/sdk |
| Banco | PostgreSQL 16 |
| Cache/Fila | Redis 7 |
| Storage | MinIO (S3) |
| Video | Python + FFmpeg + Whisper + OpenCV |
| Infra | Docker Compose |

---

## Instalacao via Coolify / Easypanel (Recomendado)

A maioria dos usuarios vai instalar via **Coolify** ou **Easypanel** na VPS.

### Passo 1: Crie os servicos no Coolify/Easypanel

Crie cada servico apontando pro repositorio Git. Cada um usa seu Dockerfile:

| Servico | Dockerfile | Porta |
|---------|-----------|-------|
| API | `Dockerfile.api` | 3001 |
| Web | `Dockerfile.web` | 3000 |
| MCP | `Dockerfile.mcp` | 3002 |
| Bot | `Dockerfile.bot` | - |
| Video Worker | `Dockerfile.video` | - |

Tambem crie os servicos de infraestrutura (Postgres, Redis, MinIO) pelo painel.

### Passo 2: Configure as variaveis de ambiente

Copie as variaveis do `.env.example` e configure no painel do Coolify/Easypanel. As obrigatorias:

| Variavel | Descricao |
|----------|-----------|
| `DATABASE_URL` | String de conexao do Postgres |
| `REDIS_URL` | String de conexao do Redis |
| `JWT_SECRET` | Gere com `openssl rand -hex 32` |
| `INTERNAL_SERVICE_TOKEN` | Gere com `openssl rand -hex 24` |
| `MINIO_ENDPOINT` | Hostname do MinIO |
| `MINIO_ACCESS_KEY` | Access key do MinIO |
| `MINIO_SECRET_KEY` | Secret key do MinIO |
| `MINIO_PUBLIC_URL` | URL publica do MinIO |

### Passo 3: Rode as migrations

No terminal do servico API (via Coolify/Easypanel):

```bash
npx prisma migrate deploy --schema=packages/api/prisma/schema.prisma
```

### Passo 4: Acesse e configure

1. Abra a URL do servico Web gerada pelo Coolify/Easypanel
2. Cadastre sua conta (primeiro usuario vira Owner)
3. Va em **Configuracoes** e:
   - Cole as chaves de API (Instagram, Gemini, Telegram) nos campos
   - Cole a **URL do MCP** que o Coolify/Easypanel gerou pro servico MCP
4. Copie a URL do MCP e adicione como conector no **Claude Cowork**, **Claude Desktop** ou **Claude Code**

---

## Instalacao via Docker Compose (VPS direta)

Se voce tem acesso SSH direto a VPS:

```bash
git clone https://github.com/NetoNetoArreche/instapost.git
cd instapost
bash setup.sh --production
```

Isso vai:
1. Gerar `.env` com secrets aleatorios
2. Subir todos os servicos via Docker (Postgres, Redis, MinIO, API, Web, Bot, MCP, Video Worker)
3. Rodar migrations
4. Criar usuario admin (`admin@openhive.local` / `admin123`)

Acesse `http://SEU_IP:3000` e faca login.

### Conectar o MCP

Depois de instalar, a URL do MCP sera:

```
http://SEU_IP:3002/mcp
```

Adicione essa URL como conector personalizado no Claude Cowork, Claude Desktop ou Claude Code.

Voce tambem pode salvar essa URL na pagina de **Configuracoes** do OpenHive pra ter facil acesso.

---

## Instalacao Local (Desenvolvimento)

```bash
git clone https://github.com/NetoNetoArreche/instapost.git
cd instapost
bash setup.sh
npm run dev
```

Isso vai:
1. Gerar `.env` com secrets aleatorios
2. Subir infra via Docker (Postgres, Redis, MinIO)
3. Instalar dependencias e rodar migrations
4. Criar usuario admin

Depois rode `npm run dev` pra iniciar API + Web + Bot.

---

## Configuracao de Integracoes

Todas as chaves de API podem ser configuradas **direto na interface web** em **Configuracoes**:

| Integracao | O que faz | Onde conseguir |
|------------|-----------|---------------|
| **Instagram** | Publicacao automatica de posts | [Facebook Developer](https://developers.facebook.com/) - Graph API token |
| **Google Gemini** | Geracao de imagens e legendas com IA | [Google AI Studio](https://aistudio.google.com/) - API key |
| **Telegram Bot** | Gerenciar posts via Telegram | [@BotFather](https://t.me/BotFather) no Telegram |

Nao precisa editar `.env` manualmente - basta colar as chaves nos campos da pagina de Configuracoes.

---

## Conectar ao Claude (MCP)

O OpenHive tem um servidor MCP com **24 tools** que permitem ao Claude criar posts, tarefas, projetos, gerar imagens, extrair clips de video e mais.

### Como conectar:

1. Va em **Configuracoes** no OpenHive
2. Copie a **URL do MCP Server**
3. No **Claude Cowork**: Personalizar > Conectores > + > Cole a URL
4. No **Claude Desktop**: Settings > MCP Servers > Add > Cole a URL
5. No **Claude Code**: Adicione no `claude_desktop_config.json`

### Tools disponiveis:

| Categoria | Tools |
|-----------|-------|
| Posts | create_post, list_posts, add_image_to_post, schedule_post, publish_now, generate_image, generate_caption, upload_image, get_analytics |
| Tarefas | create_task, list_tasks, update_task, delete_task |
| Projetos | create_project, list_projects, get_project, update_project, delete_project |
| Modulos | add_module, update_module, delete_module |
| Video | analyze_youtube_video, cut_youtube_clips, list_video_clips |

---

## YouTube Clips

1. Va em **Clips** > **Novo Clip**
2. Cole a URL de um video do YouTube
3. O sistema baixa, transcreve (Whisper) e identifica os melhores momentos
4. Selecione quais momentos quer e clique **Gerar Clips**
5. Cada clip e gerado em formato vertical (1080x1920) com:
   - Deteccao de rosto (OpenCV) - face cam + conteudo
   - Legendas automaticas (.srt + .ass)
   - Opcao de queimar legendas no video

---

## Estrutura do Projeto

```
openhive/
  packages/
    api/          Express + Prisma + BullMQ
    web/          Next.js 14 + Tailwind
    bot/          Telegram bot (Grammy.js)
    mcp/          MCP server (24 tools)
    shared/       Tipos TypeScript compartilhados
  scripts/
    video/        Scripts Python (analyze + clipper)
  Dockerfile.*    Imagens Docker de cada servico
  docker-compose.yml              Dev (so infra)
  docker-compose.production.yml   Producao (tudo)
  setup.sh        Script de setup automatico
```

## Servicos Docker

| Servico | Porta | Descricao |
|---------|-------|-----------|
| web | 3000 | Frontend Next.js |
| api | 3001 | API Express |
| mcp | 3002 | Servidor MCP (24 tools) |
| postgres | 5432 | Banco de dados |
| redis | 6379 | Cache + fila de jobs |
| minio | 9000 | Storage de arquivos (S3) |
| minio-console | 9001 | Admin UI do MinIO |
| video-worker | - | Processador de clips YouTube |
| bot | - | Bot do Telegram |

---

## Licenca

[AGPL-3.0](LICENSE) - Voce pode usar, modificar e distribuir livremente. Se hospedar como servico, deve disponibilizar o codigo fonte.
