export type TranscriptionResponse = {
	transcript: string;
	segments: unknown[];
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
