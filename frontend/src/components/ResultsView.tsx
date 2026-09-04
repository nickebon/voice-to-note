import { useState } from "react";

type ResultsViewProps = {
	onProcessAnother: () => void;
};

export default function ResultsView({ onProcessAnother }: ResultsViewProps) {
	const [copyStatus, setCopyStatus] = useState("");
	const dummyNote = "Summary\nClient participated in a short activity and responded well to occasional prompts.\n\nNext Steps\nContinue practicing the activity with gradually fewer prompts.";

	const copyNote = async () => {
		await navigator.clipboard.writeText(dummyNote);
		setCopyStatus("Copied");
	};

	return (
		<section className="min-h-screen space-y-6 p-6">
			<h1 className="text-2xl font-bold">ResultsView placeholder</h1>
			<div className="border border-gray-300 p-4">
				<pre className="whitespace-pre-wrap">{dummyNote}</pre>
				<button type="button" className="mt-4 border border-gray-300 px-4 py-2" onClick={() => void copyNote()}>
					Copy note
				</button>
				{copyStatus && <span className="ml-3 text-sm text-gray-600">{copyStatus}</span>}
			</div>
			<button type="button" className="border border-gray-300 px-4 py-2" onClick={onProcessAnother}>
				&#8592; Process another note
			</button>
		</section>
	);
}