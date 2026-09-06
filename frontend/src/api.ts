export type TranscriptionResponse = {
	transcript: string;
	segments: unknown[];
};

export type StructureRequest = {
	transcript: string;
	quick_note?: string;
	structure_instruction?: string;
};

export type StructureResponse = {
	structured_note: string;
};

export async function transcribeAudio(
	file: File,
	signal: AbortSignal,
): Promise<TranscriptionResponse> {
	const formData = new FormData();
	formData.append("file", file);

	const response = await fetch("/transcribe", {
		method: "POST",
		body: formData,
		signal,
	});

	if (!response.ok) {
		throw new Error(`Transcription failed (${response.status})`);
	}

	return response.json() as Promise<TranscriptionResponse>;
}

export async function structureNote(request: StructureRequest): Promise<StructureResponse> {
	const response = await fetch("/structure", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(request),
	});

	if (!response.ok) {
		throw new Error(`Structuring failed (${response.status})`);
	}

	return response.json() as Promise<StructureResponse>;
}
