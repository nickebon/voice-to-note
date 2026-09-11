import { useEffect, useState } from "react";

import { structureNote } from "./api";
import ApiKeySetup from "./components/ApiKeySetup";
import NoteStructureConfig from "./components/NoteStructureConfig";
import ResultsView from "./components/ResultsView";
import TextNoteArea from "./components/TextNoteArea";
import UploadArea from "./components/UploadArea";

type NoteView = "input" | "structuring" | "results";
type AppMode = "loading" | "setup" | "notes";

function NotesWorkspace({ onManageApiKey }: { onManageApiKey: (() => void) | null }) {
	const [view, setView] = useState<NoteView>("input");
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
			<div className="flex items-center justify-between gap-4">
				<h1 className="text-2xl font-bold">miss jo&apos;s notes</h1>
				{onManageApiKey ? (
					<button type="button" className="text-sm underline underline-offset-2" onClick={onManageApiKey}>
						Change API key
					</button>
				) : null}
			</div>
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

export default function App() {
	const hasElectronBridge = typeof window.electronApi !== "undefined";
	const [appMode, setAppMode] = useState<AppMode>(hasElectronBridge ? "loading" : "notes");
	const [hasStoredApiKey, setHasStoredApiKey] = useState(false);
	const [isSavingApiKey, setIsSavingApiKey] = useState(false);
	const [apiKeyError, setApiKeyError] = useState("");

	useEffect(() => {
		if (!window.electronApi) {
			return;
		}

		let isCancelled = false;

		void window.electronApi
			.getApiKeyStatus()
			.then((status) => {
				if (isCancelled) {
					return;
				}

				setHasStoredApiKey(status.hasStoredApiKey);
				setAppMode(status.hasStoredApiKey ? "notes" : "setup");
			})
			.catch((error: unknown) => {
				if (isCancelled) {
					return;
				}

				setApiKeyError(error instanceof Error ? error.message : "Unable to load API key status.");
				setAppMode("setup");
			});

		return () => {
			isCancelled = true;
		};
	}, []);

	const handleSaveApiKey = async (apiKey: string) => {
		if (!window.electronApi) {
			return;
		}

		setIsSavingApiKey(true);
		setApiKeyError("");

		try {
			const status = await window.electronApi.saveApiKey(apiKey);
			setHasStoredApiKey(status.hasStoredApiKey);
			setAppMode("notes");
		} catch (error) {
			setApiKeyError(error instanceof Error ? error.message : "Unable to save API key.");
		} finally {
			setIsSavingApiKey(false);
		}
	};

	const handleClearApiKey = async () => {
		if (!window.electronApi) {
			return;
		}

		setIsSavingApiKey(true);
		setApiKeyError("");

		try {
			const status = await window.electronApi.clearApiKey();
			setHasStoredApiKey(status.hasStoredApiKey);
			setAppMode("setup");
		} catch (error) {
			setApiKeyError(error instanceof Error ? error.message : "Unable to clear API key.");
		} finally {
			setIsSavingApiKey(false);
		}
	};

	if (appMode === "loading") {
		return (
			<main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-6 py-10">
				<p role="status">Loading your notes...</p>
			</main>
		);
	}

	if (appMode === "setup") {
		return (
			<ApiKeySetup
				hasStoredApiKey={hasStoredApiKey}
				isSaving={isSavingApiKey}
				errorMessage={apiKeyError}
				onSave={handleSaveApiKey}
				onClear={hasStoredApiKey ? handleClearApiKey : undefined}
			/>
		);
	}

	return <NotesWorkspace onManageApiKey={window.electronApi ? () => setAppMode("setup") : null} />;
}
