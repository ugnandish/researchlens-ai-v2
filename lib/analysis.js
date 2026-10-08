import { createHash } from 'node:crypto';
import { chat, embed } from './ollama.js';
import { searchOpenAlex } from './openalex.js';
import { ensureCollection, upsert, search } from './qdrant.js';

const schema = {
	type: 'object',
	properties: {
		title: { type: 'string' },
		summary: { type: 'string' },
		researchGap: { type: 'string' },
		sections: {
			type: 'object',
			properties: {
				abstract: { type: 'string' },
				problem: { type: 'string' },
				gap: { type: 'string' },
				objectives: { type: 'string' },
				methodology: { type: 'string' },
				novelty: { type: 'string' },
				impact: { type: 'string' },
				budget: { type: 'string' },
				references: { type: 'string' },
			},
			required: ['abstract', 'problem', 'gap', 'objectives', 'methodology', 'novelty', 'impact', 'budget', 'references'],
			additionalProperties: false,
		},
		scores: {
			type: 'object',
			properties: {
				methodology: { type: 'number' },
				novelty: { type: 'number' },
			},
			required: ['methodology', 'novelty'],
			additionalProperties: false,
		},
		keywords: { type: 'array', items: { type: 'string' } },
		issues: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					severity: { type: 'string' },
					section: { type: 'string' },
					issue: { type: 'string' },
					suggestion: { type: 'string' },
				},
				required: ['severity', 'section', 'issue', 'suggestion'],
				additionalProperties: false,
			},
		},
		recommendations: { type: 'array', items: { type: 'string' } },
	},
	required: ['title', 'summary', 'researchGap', 'sections', 'scores', 'keywords', 'issues', 'recommendations'],
	additionalProperties: false,
};

export async function analyzeProposal(text, proposalId) {
	const prompt = `You are a rigorous grant-review assistant. Analyze the proposal without inventing facts. Return data values only, never schema descriptions. Scores are 0-100 quality indicators, not funding probabilities. Keep the summary and research gap under 30 words. Give each requested section one concise sentence. Return at most 4 keywords, 2 issues, and 2 recommendations. Proposal:\n${text.slice(0, 4500)}`;
	const ai = await chat(prompt, schema);
	const keywords = ai.keywords || [];
	const query = keywords.slice(0, 8).join(' OR ');
	const papers = query ? await searchOpenAlex(query) : [];

	const proposalText = text.slice(0, 5000);
	const embeddings = await embed(proposalText);
	const vector = embeddings[0];
	await ensureCollection(vector.length);

	const priorMatches = await search(vector, 10);
	const semanticMatches = priorMatches
		.filter((match) => match.payload?.proposalId !== proposalId && match.payload?.text !== proposalText)
		.slice(0, 5);

	const hash = createHash('sha256').update(String(proposalId)).digest('hex').slice(0, 32);
	const pointId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;

	await upsert([{
		id: pointId,
		vector,
		payload: { source: 'proposal', proposalId, text: proposalText },
	}]);

	return {
		...ai,
		researchGap: ai.researchGap || ai.sections?.gap || '',
		academicMatches: papers,
		semanticMatches,
	};
}
