# ResearchLens AI — Grant Proposal Intelligence

End-to-end local-first starter for grant proposal analysis. It combines Next.js, PostgreSQL, Qdrant, Ollama, OpenAlex and a Python ML service.

## Features
- PDF/DOCX/TXT upload and extraction
- LLM-based proposal section analysis
- Novelty, methodology, gap, impact and budget indicators
- Academic discovery through OpenAlex
- Embeddings and Qdrant semantic search
- Historical fundability ML API
- Explainability-ready feature architecture
- Fairness-audit-ready historical schema
- Dockerized PostgreSQL/Qdrant/ML service

## 1. Prerequisites
- Node.js 20+
- Docker Desktop
- Ollama

## 2. Configure
Copy `.env.example` to `.env.local`.

Install models:
```bash
ollama pull gemma3:4b
ollama pull embeddinggemma
```

## 3. Start infrastructure
```bash
docker compose up -d
```

## 4. Install and database
```bash
npm install
npx prisma generate
npx prisma db push
```

## 5. Run
```bash
npm run dev
```
Open http://localhost:3000

## 6. Production ML workflow
Do NOT treat the included Python model as a validated predictor. It is a smoke-test model with placeholder training rows. Replace it with real historical funded/rejected proposals and proper train/validation/test splits.

Recommended historical columns:
`title, abstract, department, funding_scheme, requested_amount, pi_experience, previous_grants, publications, methodology_score, novelty_score, budget_percentile, outcome, gender, institution_type, seniority`.

Sensitive attributes should primarily be retained for fairness auditing, not blindly used as predictive features.

## 7. Recommended next production steps
1. Add authentication and role-based access.
2. Add secure object storage instead of local uploads.
3. Add background job queue for long analyses.
4. Add exact/fuzzy/semantic document matching.
5. Train and calibrate model on real historical outcomes.
6. Add SHAP explanations after training.
7. Add group fairness metrics (TPR/FPR, calibration, selection-rate comparisons) with minimum sample thresholds.
8. Add audit logs and data retention controls.
9. Add human-review workflow and report export.

## Architecture
Next.js -> PostgreSQL
Next.js -> Ollama -> Qdrant
Next.js -> OpenAlex
Next.js -> Python ML service
