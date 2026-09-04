import { useState } from "react";

import NoteStructureConfig from "./components/NoteStructureConfig";
import ResultsView from "./components/ResultsView";
import TextNoteArea from "./components/TextNoteArea";
import UploadArea from "./components/UploadArea";

export default function App() {
	const [view, setView] = useState<"input" | "results">("input");
	const [transcript, setTranscript] = useState("");
	const [extraNote, setExtraNote] = useState("");
	const [structureInstruction, setStructureInstruction] = useState("");
	const [referenceFile, setReferenceFile] = useState<File | null>(null);

	const resetForm = () => {
		setTranscript("");
		setExtraNote("");
		setStructureInstruction("");
		setReferenceFile(null);
		setView("input");
	};

	if (view === "results") {
		return <ResultsView onProcessAnother={resetForm} />;
	}

	return (
		<main className="mx-auto max-w-3xl space-y-8 p-6">
			<h1 className="text-2xl font-bold">voice-to-note-v1</h1>
			<UploadArea onTranscript={setTranscript} onComplete={() => setView("results")} />
			<TextNoteArea value={extraNote} onChange={setExtraNote} />
			<NoteStructureConfig
				instruction={structureInstruction}
				referenceFile={referenceFile}
				onInstructionChange={setStructureInstruction}
				onReferenceFileChange={setReferenceFile}
			/>
			<button type="button" className="border border-gray-300 px-4 py-2" onClick={() => setView("results")}>
				Debug: show results view
			</button>
			{transcript && <p className="sr-only">Transcript ready for structuring.</p>}
		</main>
	);
}
