const base=process.env.OLLAMA_URL||'http://localhost:11434';
export async function chat(prompt, format = 'json') {
	const response = await fetch(`${base}/api/generate`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			model: process.env.OLLAMA_CHAT_MODEL || 'gemma3:4b',
			prompt,
			stream: true,
			format,
			options: {
				num_ctx: 2048,
				num_predict: 700,
				temperature: 0.5,
				repeat_penalty: 1.25,
				repeat_last_n: 128,
			},
		}),
	});

	if (!response.ok) {
		throw new Error(`Ollama chat ${response.status}: ${(await response.text()).slice(0, 300)}`);
	}
	if (!response.body) throw new Error('Ollama chat returned an empty response stream');

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	let generated = '';
	let finished = false;

	while (!finished) {
		const { done, value } = await reader.read();
		buffer += decoder.decode(value, { stream: !done });
		const lines = buffer.split('\n');
		buffer = lines.pop() || '';
		if (done && buffer.trim()) lines.push(buffer);

		for (const line of lines) {
			if (!line.trim()) continue;
			const chunk = JSON.parse(line);
			if (chunk.error) throw new Error(`Ollama chat failed: ${chunk.error}`);
			generated += chunk.response || '';
			if (chunk.done) {
				finished = true;
				break;
			}
		}

		if (done) break;
	}

	return JSON.parse(generated);
}
export async function embed(input){const r=await fetch(`${base}/api/embed`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:process.env.OLLAMA_EMBED_MODEL||'embeddinggemma',input})}); if(!r.ok) throw new Error(`Ollama embed ${r.status}`); return (await r.json()).embeddings;}
