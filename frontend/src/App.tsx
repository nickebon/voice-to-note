import { useState } from "react";

import { structureNote } from "./api";
import NoteStructureConfig from "./components/NoteStructureConfig";
import ResultsView from "./components/ResultsView";
import TextNoteArea from "./components/TextNoteArea";
import UploadArea from "./components/UploadArea";

export default function App() {
	const [view, setView] = useState<"input" | "structuring" | "results">("input");
	const [transcript, setTranscript] = useState("");
	const [structuredNote, setStructuredNote] = useState("");
	const [extraNote, setExtraNote] = useState("");
	const [structureInstruction, setStructureInstruction] = useState("");
	const [referenceFile, setReferenceFile] = useState<File | null>(null);
	const [structureError, setStructureError] = useState("");

	const resetForm = () => {
		setTranscript("");
		setStructuredNote("");
		setExtraNote("");
		setStructureInstruction("");
		setReferenceFile(null);
		setStructureError("");
		setView("input");
	};

	const processTranscript = async (transcriptToProcess: string) => {
		setView("structuring");
		setStructureError("");

		try {
			const result = await structureNote({
				transcript: transcriptToProcess,
				quick_note: extraNote,
				structure_instruction: referenceFile ? "" : structureInstruction,
			});
			setStructuredNote(result.structured_note);
			setView("results");
		} catch (requestError) {
			setStructureError(requestError instanceof Error ? requestError.message : "Unable to structure this note.");
			setView("input");
		}
	};

	if (view === "results") {
		return <ResultsView onProcessAnother={resetForm} transcript={transcript} structuredNote={structuredNote} />;
	}

	return (
		<main className="mx-auto max-w-3xl space-y-8 p-6">
			<h1 className="text-2xl font-bold">miss jo's notes</h1>
			<UploadArea onTranscript={setTranscript} />
			<TextNoteArea value={extraNote} onChange={setExtraNote} />
			<NoteStructureConfig
				instruction={structureInstruction}
				referenceFile={referenceFile}
				onInstructionChange={setStructureInstruction}
				onReferenceFileChange={setReferenceFile}
			/>
			<button
				type="button"
				className="border border-gray-300 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
				onClick={() => void processTranscript(transcript)}
				disabled={!transcript.trim() || view === "structuring"}
			>
				Create note
			</button>
			{view === "structuring" && <p role="status">Structuring your note...</p>}
			{structureError && (
				<div className="space-y-2 text-sm text-red-600" role="alert">
					<p>{structureError}</p>
					<button type="button" className="border border-gray-300 px-4 py-2 text-gray-900" onClick={() => void processTranscript(transcript)}>
						Retry
					</button>
				</div>
			)}
			{transcript && <p className="sr-only">Transcript ready for structuring.</p>}
		</main>
	);
}
