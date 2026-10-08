'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
	const router = useRouter();
	const [file, setFile] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	async function run() {
		if (!file) return;

		setLoading(true);
		setError('');
		let stage = 'upload';

		try {
			const formData = new FormData();
			formData.append('file', file);

			const uploadResponse = await fetch('/api/upload', {
				method: 'POST',
				body: formData,
			});
			const uploadData = await uploadResponse.json();

			if (!uploadResponse.ok) throw new Error(uploadData.error);

			stage = 'analysis';
			const analysisResponse = await fetch('/api/analyze', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ id: uploadData.id }),
			});
			const analysisData = await analysisResponse.json();

			if (!analysisResponse.ok) throw new Error(analysisData.error);

			router.push(`/dashboard/${uploadData.id}`);
		} catch (cause) {
			const message = cause instanceof Error ? cause.message : 'Request failed';
			setError(message === 'fetch failed'
				? `${stage === 'analysis' ? 'Analysis' : 'Upload'} could not reach a required service. Check Ollama, Qdrant, and the server logs.`
				: `${stage === 'analysis' ? 'Analysis' : 'Upload'} failed: ${message}`);
		} finally {
			setLoading(false);
		}
	}

	return (
		<main>
			<header>
				<h1>ResearchLens AI</h1>
				<p>Grant proposal intelligence and pre-submission review</p>
			</header>
			<section className="card">
				<h2>Upload proposal</h2>
				<input
					type="file"
					accept=".pdf,.docx,.txt"
					onChange={(event) => setFile(event.target.files?.[0] ?? null)}
				/>
				<button onClick={run} disabled={!file || loading}>
					{loading ? 'Analyzing...' : 'Analyze proposal'}
				</button>
				{error && <p className="error">{error}</p>}
			</section>
		</main>
	);
}
