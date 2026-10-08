'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const { id } = useParams();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadProposal() {
      try {
        const response = await fetch(`/api/proposals/${encodeURIComponent(id)}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Could not load proposal');
        if (!data.proposal.analysis) throw new Error('This proposal has not been analyzed yet.');

        if (active) setProposal(data.proposal);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load proposal');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProposal();

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return <main><p role="status">Loading analysis...</p></main>;
  }

  if (error) {
    return (
      <main>
        <p className="error" role="alert">{error}</p>
        <Link href="/">Upload another proposal</Link>
      </main>
    );
  }

  const result = proposal.analysis.result;
  const fundability = result.fundability;

  return (
    <main>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Analysis dashboard</p>
          <h1>{result.title || proposal.filename}</h1>
          <p>{proposal.filename}</p>
        </div>
        <Link className="back-link" href="/">New analysis</Link>
      </header>

      <section className="card">
        <h2>Summary</h2>
        <p>{result.summary || 'No summary was returned.'}</p>
      </section>

      {result.researchGap && (
        <section className="card">
          <h2>Research gap</h2>
          <p>{typeof result.researchGap === 'string'
            ? result.researchGap
            : result.researchGap.assessment || result.researchGap.summary || 'No gap assessment was returned.'}</p>
        </section>
      )}

      {fundability && (
        <section className="card">
          <h2>Historical fundability model</h2>
          <p className="big">
            {fundability.probability != null
              ? `${Math.round(fundability.probability * 100)}%`
              : 'Unavailable'}
          </p>
          <p>{fundability.note || 'An estimate from historical training data, not a guarantee of funding.'}</p>
        </section>
      )}

      {Object.keys(result.scores || {}).length > 0 && (
        <section className="grid" aria-label="Proposal scores">
          {Object.entries(result.scores).map(([name, score]) => (
            <div className="metric" key={name}>
              <span>{name}</span>
              <b>{score}</b>
            </div>
          ))}
        </section>
      )}

      {Object.keys(result.sections || {}).length > 0 && (
        <section className="card">
          <h2>Review by section</h2>
          {Object.entries(result.sections).map(([name, detail]) => (
            <article key={name}>
              <b>{name}</b>
              <p>{typeof detail === 'string' ? detail : detail?.assessment || detail?.status || 'No assessment provided.'}</p>
            </article>
          ))}
        </section>
      )}

      {(result.issues || []).length > 0 && (
        <section className="card">
          <h2>Issues and recommendations</h2>
          {result.issues.map((issue, index) => (
            <div className="issue" key={`${issue.section || 'issue'}-${index}`}>
              <b>{[issue.severity, issue.section].filter(Boolean).join(' · ') || 'Review item'}</b>
              <p>{issue.issue}</p>
              {issue.suggestion && <small>{issue.suggestion}</small>}
            </div>
          ))}
        </section>
      )}

      {(result.recommendations || []).length > 0 && (
        <section className="card">
          <h2>Recommendations</h2>
          <ul>
            {result.recommendations.map((recommendation, index) => (
              <li key={index}>{recommendation}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>Semantic similarity</h2>
        <p>Similarity identifies related text in the indexed proposal corpus; it is not a plagiarism determination.</p>
        {(result.semanticMatches || []).length === 0
          ? <p>No prior indexed proposals were found for comparison.</p>
          : result.semanticMatches.map((match, index) => (
            <article key={match.id || index}>
              <b>{match.payload?.filename || match.payload?.proposalId || 'Prior proposal'}</b>
              <div>{Math.round((match.score || 0) * 100)}% semantic similarity</div>
              {match.payload?.text && <p>{match.payload.text.slice(0, 360)}{match.payload.text.length > 360 ? '...' : ''}</p>}
            </article>
          ))}
      </section>

      {(result.academicMatches || []).length > 0 && (
        <section className="card">
          <h2>Related academic research</h2>
          {result.academicMatches.map((paper, index) => (
            <article key={paper.id || index}>
              <b>{paper.title || 'Untitled research'}</b>
              <div>{paper.year || 'Year unavailable'} · cited {paper.cited || 0}</div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}