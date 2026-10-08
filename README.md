# ResearchLens AI

ResearchLens AI is a local-first grant proposal review application. It accepts PDF, DOCX, and TXT files, extracts their text, and creates a structured qualitative review. The application combines a Next.js web app and API, PostgreSQL for proposal and analysis records, Ollama for language-model analysis and embeddings, Qdrant for semantic similarity, OpenAlex for related academic works, and an optional Python ML demo service.

This repository is a development/demo starter, not a production grant decision system. Read [Limitations and production notes](#limitations-and-production-notes) before using real or sensitive proposal data.

## What It Does

- Extracts proposal text from uploaded PDF, DOCX, and TXT files.
- Produces a summary, section reviews, quality indicators, issues, and recommendations using a locally hosted Ollama model.
- Searches OpenAlex for related scholarly works based on generated keywords.
- Embeds proposal text and searches prior indexed proposals in Qdrant.
- Optionally returns a historical-likelihood estimate from the Python ML service.
- Stores proposals and analysis results in PostgreSQL.

## Software Used and Purpose

| Software/service | Required? | Purpose in this project |
| --- | --- | --- |
| Node.js 20.9+ and npm | Yes | Run the Next.js server and install JavaScript packages. |
| Next.js and React | Included in the project | Provide the web application, pages, and server-side API routes. |
| Docker Desktop and Docker Compose | Yes for local setup | Run PostgreSQL, Qdrant, and the Python ML service in containers. |
| PostgreSQL 16 | Yes | Store proposal text, metadata, and analysis results. |
| Prisma | Included in the project | Define database models, generate the database client, and apply the local schema. |
| Ollama | Yes | Run the language and embedding models locally. |
| `gemma3:4b` | Yes for main workflow | Default Ollama model that generates proposal reviews. |
| `embeddinggemma` | Yes for main workflow | Default Ollama model that encodes proposals for similarity search. |
| Qdrant | Yes for main workflow | Store and search proposal embeddings. |
| OpenAlex API | Used during analysis; internet required | Find related academic works; no API key is required, and `OPENALEX_EMAIL` is optional. |
| Python 3.11, FastAPI, scikit-learn | Optional feature; supplied through Docker | Provide the demo prediction API. Docker installs Python dependencies from `python-service/requirements.txt`. |
| Git | Optional | Clone the source repository if it is not already on the computer. |
| PowerShell | Used in Windows instructions | Run the setup commands below on Windows; macOS/Linux users can use the Bash alternatives. |

## Architecture

```mermaid
flowchart LR
	Browser[Web browser]
	Next[Next.js UI and route handlers]
	DB[(PostgreSQL<br/>proposal and analysis records)]
	Ollama[Ollama<br/>chat and embeddings]
	Qdrant[(Qdrant<br/>proposal vectors)]
	OpenAlex[OpenAlex API<br/>related works]
	ML[FastAPI ML demo<br/>optional]

	Browser -->|upload and view| Next
	Next -->|save and retrieve| DB
	Next -->|analysis prompt and embedding| Ollama
	Next -->|store and search vectors| Qdrant
	Next -->|keyword search over HTTPS| OpenAlex
	Next -. optional prediction .-> ML
```

### Main browser workflow

The home page in `app/page.js` uploads to `POST /api/upload`, then starts analysis with `POST /api/analyze`. When analysis completes, the browser opens `/dashboard/[id]`, which loads the proposal and saved analysis from `GET /api/proposals/[id]`.

1. The upload handler validates the extension, saves a copy under `uploads/`, extracts text, and creates a `Proposal` row in PostgreSQL.
2. The analysis handler reads the saved proposal. `lib/analysis.js` asks Ollama for structured JSON, searches OpenAlex using generated keywords, embeds the proposal, and searches/upserts its vector in Qdrant.
3. The handler makes a best-effort request to the ML service and saves the result as an `Analysis` row. If the ML service is unavailable, qualitative analysis can still succeed.
4. The dashboard fetches the saved proposal and renders the summary, sections, scores, issues, recommendations, academic matches, and semantic matches.

### Main components

| Location | Responsibility |
| --- | --- |
| `app/page.js` | Upload-and-analyze home page. |
| `app/dashboard/[id]/page.js` | Displays a saved proposal analysis. |
| `app/api/upload/route.js` | Saves uploaded files, extracts text, and creates proposal records. |
| `app/api/analyze/route.js` | Orchestrates analysis, optional ML prediction, and persistence. |
| `app/api/proposals/[id]/route.ts` | Loads a proposal and its related analysis. |
| `lib/analysis.js` | Builds the analysis request and connects Ollama, OpenAlex, and Qdrant. |
| `lib/ollama.js` | Ollama chat and embedding calls used by the main flow. |
| `lib/openalex.js` | Related-work search against the OpenAlex Works API. |
| `lib/qdrant.js` | Collection management and vector search/upsert. |
| `lib/prisma.js` | PostgreSQL access for the main JavaScript routes. |
| `prisma/schema.prisma` | Proposal, analysis, and historical-proposal data models. |
| `python-service/main.py` | FastAPI health, prediction, and in-memory training endpoints. |
| `docker-compose.yml` | Local PostgreSQL, Qdrant, and Python ML containers. |

There is also a second set of TypeScript proposal handlers at `app/api/proposals/upload/route.ts` and `app/api/proposals/[id]/analyze/route.ts`. They are not used by the current home page. They use the `lib/*.ts` Ollama/Qdrant helpers and have different configuration defaults; use the browser flow above as the documented end-to-end path.

### Data model and persistence

- `Proposal` stores the original filename, extracted text, status, optional metadata, and creation time.
- `Analysis` stores the JSON result and summary. It has a one-to-one relationship with a proposal; rerunning analysis updates that record.
- `HistoricalProposal` defines fields for historical outcomes and fairness-audit attributes, but the current prediction route does not load training data from this table.
- Uploaded files are written to the local `uploads/` directory. PostgreSQL and Qdrant use Docker named volumes (`pgdata` and `qdrantdata`).

## Prerequisites

- Node.js 20.9 or newer and npm.
- Docker Desktop with Docker Compose, running.
- Ollama installed and running locally.
- Enough local disk space for the Ollama models and Docker volumes.
- Internet access for downloading models and querying OpenAlex.

The project uses Next.js App Router route handlers. The locally installed Next.js documentation is in `node_modules/next/dist/docs/`; refer to it when changing framework code because the dependency is specified as `latest`.

## Installation and First Run

The steps below use Windows PowerShell. Run project commands from the repository root, the folder containing `package.json` and `docker-compose.yml`.

### 1. Install the required software

Install Node.js 20.9 or newer, Docker Desktop, and Ollama. Install Git if you need to clone the repository. Start Docker Desktop and Ollama after installation. Keep enough disk space available for the Ollama models and Docker volumes.

The app uses Next.js App Router route handlers. Next.js is set to `latest` in `package.json`; documentation for the installed version is available in `node_modules/next/dist/docs/` after dependencies have been installed.

### 2. Get and open the project

If the project is already open in VS Code, open a terminal in its root folder. Otherwise clone it using the repository's Git URL, then change into the downloaded folder:

```powershell
git clone <repository-url>
Set-Location <repository-folder>
```

Replace the placeholders with the actual repository URL and folder name. Confirm you are in the project root:

```powershell
Get-ChildItem package.json, docker-compose.yml
```

### 3. Verify the installed tools

```powershell
node --version
npm --version
docker compose version
ollama --version
```

Confirm Node.js is version 20.9 or newer and Docker Desktop is running. If a command is not recognized, install or restart that software before continuing.

### 4. Configure environment variables

Copy `.env.example` to `.env`. The `.env` filename is important: `prisma.config.ts` loads environment variables with `dotenv/config`, which reads `.env` by default.

PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

The default values match the local Docker Compose ports. Change them if those ports are already in use.

| Variable | Default | Used for |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://researchlens:researchlens@localhost:5433/researchlens` | Prisma/PostgreSQL connection. |
| `OLLAMA_URL` | `http://localhost:11434` | Main browser workflow's Ollama chat and embedding requests. |
| `OLLAMA_CHAT_MODEL` | `gemma3:4b` | Main workflow's analysis model. |
| `OLLAMA_EMBED_MODEL` | `embeddinggemma` | Main workflow's embedding model. |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant REST endpoint. |
| `QDRANT_COLLECTION` | `researchlens_chunks` | Collection for proposal vectors. |
| `OPENALEX_EMAIL` | empty | Optional email for OpenAlex's `mailto` parameter. |
| `ML_SERVICE_URL` | `http://localhost:8000` | Optional Python ML service base URL. |

Do not commit `.env`; keep credentials and private configuration out of source control.

### 5. Download the Ollama models

Install Ollama for your operating system, start its local service, then pull the configured models:

```bash
ollama pull gemma3:4b
ollama pull embeddinggemma
```

The Ollama service should be reachable at `http://localhost:11434`. If you change model names, update `.env` to match. The first analysis may take longer while models load.

### 6. Start the database, vector store, and ML service

```bash
docker compose up -d
```

This starts:

- PostgreSQL at `localhost:5433` (container port `5432`).
- Qdrant at `localhost:6333`.
- The FastAPI ML service at `localhost:8000`.

Check service state and logs with:

```bash
docker compose ps
docker compose logs -f
```

### 7. Install app dependencies and initialize the database

```bash
npm install
npx prisma generate
npx prisma db push
```

`db push` creates/updates the local database schema from `prisma/schema.prisma`. It is suitable for this starter's local development workflow; use versioned migrations for a managed deployment.

### 8. Start the web application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The available npm scripts are `dev`, `build`, and `start` (production mode); there is currently no test or lint script in `package.json`.

### 9. Run an end-to-end proposal analysis

1. Open the home page at `http://localhost:3000`.
2. Choose a text-based PDF, DOCX, or TXT proposal.
3. Select **Analyze proposal** and wait for the analysis to finish.
4. Review the generated dashboard. A newly uploaded proposal will generally have no previous semantic matches until other proposals have been indexed.

Scanned PDFs without an embedded text layer may produce no usable extracted text. OCR is not currently configured.

### 10. Confirm the services are reachable

In a second PowerShell terminal, check the database and Python service:

```powershell
Invoke-RestMethod http://localhost:3000/api/db-test
Invoke-RestMethod http://localhost:8000/health
```

The first response should have `success: true`; the second should have `status: ok`. The ML service is optional for analysis, but PostgreSQL, Ollama, and Qdrant must be available for the complete browser workflow.

## Service Checks and API Routes

Useful local checks:

| Check | Expected result |
| --- | --- |
| `GET http://localhost:8000/health` | `{"status":"ok"}` when the ML container is running. |
| `GET http://localhost:3000/api/db-test` | JSON with `success: true` and the current proposal count. |
| `http://localhost:6333/dashboard` | Qdrant's local dashboard, if served by the installed Qdrant image. |

Primary application endpoints:

| Method and path | Purpose |
| --- | --- |
| `POST /api/upload` | Accepts multipart form data with a `file` field; returns proposal ID and extracted text length. |
| `POST /api/analyze` | Accepts JSON `{ "id": "<proposal-id>" }`; runs analysis and saves its result. |
| `GET /api/proposals/:id` | Returns the proposal and associated analysis. |
| `GET /api/db-test` | Checks PostgreSQL connectivity by counting proposals. |

Python ML endpoints are `GET /health`, `POST /predict`, and `POST /train`. The training endpoint accepts a JSON array of feature rows and requires at least 20 rows; training is in memory and resets when the service restarts.

## Build and Run in Production Mode

After completing environment setup and database initialization:

```bash
npm run build
npm run start
```

The production server defaults to port 3000. The app still requires PostgreSQL, Ollama, and Qdrant; the ML service is optional for the main analysis response. Configure the same server-side environment variables in the deployment environment. Do not expose private credentials as `NEXT_PUBLIC_*` variables.

## Stop and Reset Local Services

Stop containers without deleting their persisted data:

```bash
docker compose down
```

Start them again later with `docker compose up -d`. To deliberately remove the database and vector data volumes as well, run `docker compose down -v`; this permanently deletes local PostgreSQL and Qdrant data.

## Troubleshooting

- **Prisma reports a missing `DATABASE_URL`:** confirm the root `.env` exists and contains `DATABASE_URL`, then rerun Prisma commands from the repository root.
- **Database connection refused:** check `docker compose ps`, confirm PostgreSQL is healthy, and ensure `.env` uses port `5433` for the host connection.
- **Ollama connection refused:** start Ollama and verify `http://localhost:11434`; pull both configured models.
- **Model not found:** run `ollama list` and make the model names in `.env` match the installed names.
- **Qdrant connection refused:** check the Qdrant container and `QDRANT_URL` (`http://localhost:6333` from the host-run Next.js app).
- **Analysis fails while the infrastructure is running:** inspect the Next.js terminal output and `docker compose logs -f`; OpenAlex also requires outbound internet access.
- **Upload says no text was extracted:** use a text-based PDF or convert the scanned file with OCR before uploading.
- **Port is already allocated:** stop the conflicting process or change the host port mapping in `docker-compose.yml` and update the corresponding `.env` URL.

## Limitations and Production Notes

- The included ML model is fitted at startup to six hard-coded illustrative rows. Its probability is not a calibrated fundability estimate and must not be used for grant decisions.
- `/train` accepts rows in memory but is not connected to `HistoricalProposal`, does not persist the model, and does not perform validation or calibration. Use real, lawfully obtained historical outcomes and rigorous train/validation/test splits before evaluating any predictor.
- `HistoricalProposal` includes sensitive/audit fields. Do not use sensitive characteristics as predictive features by default; design privacy, consent, retention, and fairness reviews before storing real records.
- There is no authentication, authorization, rate limiting, or background job queue. Uploaded files and extracted proposal text may be sensitive. The local upload directory and database currently have no application-level retention or access controls.
- OpenAlex results require network access. Ollama, PostgreSQL, and Qdrant are dependencies of the main end-to-end workflow; the ML API is optional.
- Semantic similarity is a retrieval aid, not a plagiarism determination. LLM-generated analyses and scores may be incomplete or incorrect and require human review.

Before production use, add authentication and role-based access, secure object storage, validated database migrations, audit/retention controls, background processing, human review, export controls, and an evaluated model and fairness monitoring process. Use real historical data only after applicable privacy and governance approvals.
