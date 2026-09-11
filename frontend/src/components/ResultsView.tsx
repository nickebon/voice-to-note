import { useState } from "react";

type ResultsViewProps = {
	onProcessAnother: () => void;
	transcript: string;
	structuredNote: string;
};

export default function ResultsView({ onProcessAnother, transcript, structuredNote }: ResultsViewProps) {
	const [copyStatus, setCopyStatus] = useState("");

	const copyNote = async () => {
		await navigator.clipboard.writeText(structuredNote);
		setCopyStatus("Copied");
	};

	return (
		<section className="min-h-screen space-y-6 p-6">
			<h1 className="text-2xl font-bold">Your note</h1>
			<div className="border border-gray-300 p-4">
				<pre className="whitespace-pre-wrap">{structuredNote}</pre>
				<button type="button" className="mt-4 border border-gray-300 px-4 py-2" onClick={() => void copyNote()}>
					Copy note
				</button>
				{copyStatus && <span className="ml-3 text-sm text-gray-600">{copyStatus}</span>}
			</div>
			<div className="border border-gray-300 p-4">
				<h2 className="mb-2 font-semibold">Raw transcript</h2>
				<pre className="whitespace-pre-wrap">{transcript}</pre>
			</div>
			<button type="button" className="border border-gray-300 px-4 py-2" onClick={onProcessAnother}>
				&#8592; Process another note
			</button>
		</section>
	);
}