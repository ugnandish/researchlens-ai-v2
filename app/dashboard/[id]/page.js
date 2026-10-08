'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

function formatObjectiveScores(value) {
  const serialized = value.replace(/^#{1,6}\s*objectives\s*/i, '').trim();
  if (!serialized.startsWith('{')) return null;

  const overallScore = serialized.match(/['"‘’]?overallScore['"‘’]?\s*:\s*(\d+(?:\.\d+)?)/i);
  const objectives = Array.from(serialized.matchAll(/['"‘’]?objective[_\s-]?(\d+)['"‘’]?\s*:\s*\{\s*['"‘’]?score['"‘’]?\s*:\s*(\d+(?:\.\d+)?)/gi))
    .sort((left, right) => Number(left[1]) - Number(right[1]));

  if (!overallScore && objectives.length === 0) return null;

  return [
    overallScore ? `Overall score: ${overallScore[1]} / 100` : '',
    ...objectives.map(([, number, score]) => `Objective ${number}: ${score} / 100`),
  ].filter(Boolean).join('\n');
}

function getText(value, fallback = 'No assessment was returned.') {
  if (value === null || value === undefined || value === '') return fallback;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return fallback;

    const formattedObjectives = formatObjectiveScores(trimmed);
    if (formattedObjectives) return formattedObjectives;

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') return getText(parsed, fallback);
      } catch {
        const score = trimmed.match(/^\{\s*['"‘’]?score['"‘’]?\s*:\s*(-?\d+(?:\.\d+)?)\s*\}$/i);
        if (score) return `Score: ${score[1]} / 100`;

        const objectives = Array.from(trimmed.matchAll(/['"‘’]?objective[_\s-]?(\d+)['"‘’]?\s*:\s*['"‘’]([^'"‘’]*?)['"‘’]\s*,\s*['"‘’]?score['"‘’]?\s*:\s*(\d+(?:\.\d+)?)/gi));
        if (objectives.length > 0) {
          return objectives.map(([, number, objective, objectiveScore]) =>
            `${number}. ${objective.trim()}  (Score: ${objectiveScore} / 100)`
          ).join('\n');
        }
      }
    }

    return trimmed;
  }

  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (Array.isArray(value)) {
    return value.map((item, index) => `${index + 1}. ${getText(item, '')}`).join('\n');
  }

  if (value && typeof value === 'object') {
    const displayKey = ['assessment', 'summary', 'status', 'text', 'description', 'value']
      .find((key) => value[key] !== null && value[key] !== undefined);
    const entries = Object.entries(value);

    if (displayKey && entries.length === 1) return getText(value[displayKey], fallback);

    return entries.map(([key, entry]) => {
      if (key === 'score' && typeof entry === 'number') return `Score: ${entry} / 100`;
      return `${formatLabel(key)}: ${getText(entry, '')}`;
    }).join('\n');
  }

  return fallback;
}

function formatLabel(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function buildReportText(proposal, result) {
  const lines = [
    'RESEARCHLENS AI - PROPOSAL REVIEW',
    `Proposal: ${getText(result.title, proposal.filename)}`,
    `File: ${proposal.filename}`,
    '',
    'EXECUTIVE SUMMARY',
    getText(result.summary, 'No summary was returned.'),
  ];

  if (result.researchGap) {
    lines.push('', 'RESEARCH GAP', getText(result.researchGap));
  }

  if (Object.keys(result.sections || {}).length > 0) {
    lines.push('', 'SECTION REVIEW');
    for (const [name, detail] of Object.entries(result.sections)) {
      lines.push('', formatLabel(name), getText(detail));
    }
  }

  if ((result.issues || []).length > 0) {
    lines.push('', 'ISSUES');
    for (const issue of result.issues) {
      lines.push(`- ${issue.severity || 'Review'}: ${issue.issue || 'Unspecified issue'}`);
      if (issue.suggestion) lines.push(`  Suggestion: ${issue.suggestion}`);
    }
  }

  if ((result.recommendations || []).length > 0) {
    lines.push('', 'RECOMMENDATIONS');
    result.recommendations.forEach((recommendation, index) => {
      lines.push(`${index + 1}. ${recommendation}`);
    });
  }

  lines.push('', 'AI-generated review. Human review is required.');
  return lines.join('\n');
}

export default function Dashboard() {
  const { id } = useParams();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [completedRecommendations, setCompletedRecommendations] = useState({});

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

  const result = proposal.analysis.result || {};
  const reportTitle = getText(result.title, proposal.filename);
  const fundability = result.fundability;
  const scores = Object.entries(result.scores || {});
  const sections = Object.entries(result.sections || {});
  const issues = result.issues || [];
  const recommendations = result.recommendations || [];
  const semanticMatches = result.semanticMatches || [];
  const academicMatches = result.academicMatches || [];
  const completedCount = Object.values(completedRecommendations).filter(Boolean).length;

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(result.summary || '');
      setCopyMessage('Summary copied');
    } catch {
      setCopyMessage('Clipboard access is unavailable');
    }
  }

  function downloadReport() {
    const file = new Blob([buildReportText(proposal, result)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportTitle.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-|-$/g, '') || 'proposal-review'}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function toggleRecommendation(index) {
    setCompletedRecommendations((current) => ({
      ...current,
      [index]: !current[index],
    }));
  }

  return (
    <main className="review-page">
      <header className="review-topbar">
        <Link className="review-brand" href="/" aria-label="ResearchLens AI home">
          <span className="brand-mark" aria-hidden="true">R</span>
          <span>ResearchLens <b>AI</b></span>
        </Link>
        <div className="review-actions">
          <button className="quiet-button" type="button" onClick={copySummary}>
            Copy summary
          </button>
          <button className="solid-button" type="button" onClick={downloadReport}>
            Download report <span aria-hidden="true">↓</span>
          </button>
          <Link className="new-review-link" href="/">New review <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      {copyMessage && <p className="review-toast" role="status">{copyMessage}</p>}

      <section className="report-title-block" aria-labelledby="report-title">
        <div className="report-kicker"><span className="status-dot" /> Proposal review <span className="kicker-divider">/</span> Saved analysis</div>
        <h1 id="report-title">{reportTitle}</h1>
        <p className="report-filename">{proposal.filename}</p>
      </section>

      <nav className="review-nav" aria-label="Review sections">
        <a href="#overview">Overview</a>
        <a href="#section-review">Section review</a>
        <a href="#findings">Findings & actions</a>
        <a href="#related-work">Related work</a>
      </nav>

      <section className="overview-layout" id="overview" aria-labelledby="overview-title">
        <div className="overview-copy">
          <div className="section-heading-row">
            <div>
              <p className="section-index">01 / Overview</p>
              <h2 id="overview-title">Executive summary</h2>
            </div>
            <span className="review-status">AI review</span>
          </div>
          <p className="summary-copy">{getText(result.summary, 'No summary was returned.')}</p>
          {result.researchGap && (
            <div className="gap-note">
              <span className="gap-symbol" aria-hidden="true">↳</span>
              <div><b>Research gap</b><p>{getText(result.researchGap)}</p></div>
            </div>
          )}
        </div>

        <aside className="overview-aside" aria-label="Review indicators">
          <div className="aside-heading">
            <p className="section-index">Signal check</p>
            <span>{scores.length ? `${scores.length} indicators` : 'Qualitative'}</span>
          </div>
          {scores.length > 0 ? (
            <div className="score-list">
              {scores.map(([name, score]) => {
                const scoreValue = score && typeof score === 'object'
                  ? score.score ?? score.value
                  : score;
                const numericScore = Number(scoreValue);
                const validScore = Number.isFinite(numericScore);
                const progress = validScore ? Math.min(100, Math.max(0, numericScore)) : 0;

                return (
                  <div className="score-row" key={name}>
                    <div className="score-label"><span>{formatLabel(name)}</span><b>{validScore ? Math.round(numericScore) : getText(score)}</b></div>
                    <progress value={progress} max="100" aria-label={`${formatLabel(name)} score`} />
                  </div>
                );
              })}
            </div>
          ) : <p className="muted-copy">No numeric indicators were returned.</p>}
          {fundability && (
            <div className="fundability-note">
              <span>Demo model output</span>
              <b>{Number.isFinite(Number(fundability.probability)) ? `${Math.round(Number(fundability.probability) * 100)}%` : 'Unavailable'}</b>
              <p>{fundability.note || 'Not a validated funding prediction.'}</p>
            </div>
          )}
        </aside>
      </section>

      <section className="report-section" id="section-review" aria-labelledby="section-review-title">
        <div className="section-heading-row section-heading-border">
          <div>
            <p className="section-index">02 / Proposal structure</p>
            <h2 id="section-review-title">Section review</h2>
          </div>
          <span className="section-count">{sections.length} sections</span>
        </div>
        {sections.length > 0 ? (
          <div className="section-review-list">
            {sections.map(([name, detail], index) => (
              <article className="section-review-row" key={name}>
                <span className="row-number">{String(index + 1).padStart(2, '0')}</span>
                <h3>{formatLabel(name)}</h3>
                <p>{getText(detail)}</p>
              </article>
            ))}
          </div>
        ) : <p className="empty-state">No section-by-section review was returned.</p>}
      </section>

      <section className="report-section findings-layout" id="findings" aria-labelledby="findings-title">
        <div className="findings-main">
          <div className="section-heading-row section-heading-border">
            <div>
              <p className="section-index">03 / Review notes</p>
              <h2 id="findings-title">Findings</h2>
            </div>
            <span className="section-count">{issues.length} flagged</span>
          </div>
          {issues.length > 0 ? (
            <div className="finding-list">
              {issues.map((issue, index) => {
                const severity = String(issue.severity || 'note').toLowerCase();

                return (
                  <article className="finding-row" key={`${issue.section || 'finding'}-${index}`}>
                    <span className={`severity-mark severity-${severity}`} aria-hidden="true" />
                    <div>
                      <p className="finding-meta">{[getText(issue.severity, ''), getText(issue.section, '')].filter(Boolean).join(' / ') || 'Review note'}</p>
                      <h3>{getText(issue.issue, 'Unspecified issue')}</h3>
                      {issue.suggestion && <p className="finding-suggestion">{getText(issue.suggestion)}</p>}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : <p className="empty-state">No flagged issues were returned.</p>}
        </div>

        <aside className="recommendation-panel" aria-labelledby="recommendations-title">
          <div className="recommendation-heading">
            <div>
              <p className="section-index">Next steps</p>
              <h2 id="recommendations-title">Recommendations</h2>
            </div>
            {recommendations.length > 0 && <span>{completedCount}/{recommendations.length}</span>}
          </div>
          {recommendations.length > 0 ? (
            <ul className="recommendation-list">
              {recommendations.map((recommendation, index) => (
                <li className={completedRecommendations[index] ? 'recommendation-done' : ''} key={index}>
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(completedRecommendations[index])}
                      onChange={() => toggleRecommendation(index)}
                    />
                    <span>{getText(recommendation, `Recommendation ${index + 1}`)}</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : <p className="muted-copy">No recommendations were returned.</p>}
          <p className="checklist-note">Checklist selections reset when you leave this report.</p>
        </aside>
      </section>

      <section className="report-section related-section" id="related-work" aria-labelledby="related-title">
        <div className="section-heading-row section-heading-border">
          <div>
            <p className="section-index">04 / Context</p>
            <h2 id="related-title">Related work</h2>
          </div>
          <span className="section-count">{academicMatches.length + semanticMatches.length} matches</span>
        </div>

        <div className="related-grid">
          <div className="related-column">
            <div className="related-column-title"><h3>Academic research</h3><span>OpenAlex</span></div>
            {academicMatches.length > 0 ? academicMatches.map((paper, index) => {
              const paperUrl = paper.url || paper.doi;

              return (
                <article className="related-item" key={paper.id || index}>
                  <div>
                    <h4>{getText(paper.title, 'Untitled research')}</h4>
                    <p>{paper.year || 'Year unavailable'} <span>·</span> {paper.cited || 0} citations</p>
                  </div>
                  {paperUrl && <a href={paperUrl} target="_blank" rel="noreferrer" aria-label={`Open ${paper.title || 'related research'} in a new tab`}>↗</a>}
                </article>
              );
            }) : <p className="empty-state">No related academic works were returned.</p>}
          </div>

          <div className="related-column semantic-column">
            <div className="related-column-title"><h3>Proposal similarity</h3><span>Qdrant</span></div>
            <p className="similarity-caveat">Related text is a discovery aid, not a plagiarism determination.</p>
            {semanticMatches.length > 0 ? semanticMatches.map((match, index) => {
              const similarity = Math.round((Number(match.score) || 0) * 100);

              return (
                <details className="similarity-item" key={match.id || index}>
                  <summary>
                    <span>{match.payload?.filename || match.payload?.proposalId || 'Prior proposal'}</span>
                    <b>{similarity}% <span aria-hidden="true">+</span></b>
                  </summary>
                  <p>{match.payload?.text ? `${match.payload.text.slice(0, 500)}${match.payload.text.length > 500 ? '…' : ''}` : 'No proposal excerpt is available.'}</p>
                </details>
              );
            }) : <p className="empty-state">No prior indexed proposals were found.</p>}
          </div>
        </div>
      </section>

      <footer className="review-footer">
        <p>AI-generated analysis is a starting point for expert review, not a funding decision.</p>
        <Link href="/">Start another review <span aria-hidden="true">↗</span></Link>
      </footer>
    </main>
  );
}