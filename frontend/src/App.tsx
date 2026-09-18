import { useEffect, useState } from "react";

import { structureNote } from "./api";
import ApiKeySetup from "./components/ApiKeySetup";
import NoteStructureConfig from "./components/NoteStructureConfig";
import ResultsView from "./components/ResultsView";
import TextNoteArea from "./components/TextNoteArea";
import TypedSessionArea from "./components/TypedSessionArea";
import UploadArea from "./components/UploadArea";

type NoteView = "input" | "structuring" | "results";
type AppMode = "loading" | "setup" | "notes";
type InputMode = "record" | "type";

function NotesWorkspace({ onManageApiKey }: { onManageApiKey: (() => void) | null }) {
	const [view, setView] = useState<NoteView>("input");
	const [inputMode, setInputMode] = useState<InputMode>("record");
	const [transcript, setTranscript] = useState("");
	const [typedNote, setTypedNote] = useState("");
	const [structuredNote, setStructuredNote] = useState("");
	const [extraNote, setExtraNote] = useState("");
	const [structureInstruction, setStructureInstruction] = useState("");
	const [isStructureCustomized, setIsStructureCustomized] = useState(false);
	const [structureError, setStructureError] = useState("");

	const resetForm = () => {
		setTranscript("");
		setTypedNote("");
		setStructuredNote("");
		setExtraNote("");
		setStructureInstruction("");
		setIsStructureCustomized(false);
		setStructureError("");
		setInputMode("record");
		setView("input");
	};

	const changeInputMode = (nextMode: InputMode) => {
		if (nextMode === inputMode) {
			return;
		}

		if (inputMode === "record") {
			setTranscript("");
			setExtraNote("");
		} else {
			setTypedNote("");
		}

		setStructureError("");
		setInputMode(nextMode);
	};

	const processTranscript = async () => {
		const transcriptToProcess = inputMode === "record" ? transcript : typedNote;
		setView("structuring");
		setStructureError("");

		try {
			const request = {
				transcript: transcriptToProcess,
				...(isStructureCustomized && structureInstruction.trim()
					? { structure_instruction: structureInstruction }
					: {}),
				...(inputMode === "record" ? { quick_note: extraNote } : {}),
			};
			const result = await structureNote(request);
			setStructuredNote(result.structured_note);
			setView("results");
		} catch (requestError) {
			setStructureError(requestError instanceof Error ? requestError.message : "Unable to structure this note.");
			setView("input");
		}
	};

	if (view === "results") {
		return <ResultsView onProcessAnother={resetForm} transcript={inputMode === "record" ? transcript : typedNote} structuredNote={structuredNote} />;
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
			<section className="space-y-3">
				<div className="inline-flex border border-gray-300" role="group" aria-label="Note input mode">
					<button
						type="button"
						className={`px-4 py-2 ${inputMode === "record" ? "bg-[#1a2440] text-[#faf8f2]" : "bg-[#faf8f2] text-[#1a2440]"}`}
						aria-pressed={inputMode === "record"}
						onClick={() => changeInputMode("record")}
					>
						Upload audio
					</button>
					<button
						type="button"
						className={`border-l border-gray-300 px-4 py-2 ${inputMode === "type" ? "bg-[#1a2440] text-[#faf8f2]" : "bg-[#faf8f2] text-[#1a2440]"}`}
						aria-pressed={inputMode === "type"}
						onClick={() => changeInputMode("type")}
					>
						Type it out
					</button>
				</div>
				{inputMode === "record" ? <UploadArea onTranscript={setTranscript} /> : null}
			</section>
			{inputMode === "record" ? (
				<TextNoteArea value={extraNote} onChange={setExtraNote} />
			) : (
				<TypedSessionArea value={typedNote} onChange={setTypedNote} />
			)}
			<NoteStructureConfig
				instruction={structureInstruction}
				isExpanded={isStructureCustomized}
				onInstructionChange={setStructureInstruction}
				onExpandedChange={setIsStructureCustomized}
			/>
			<button
				type="button"
				className="border border-gray-300 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
				onClick={() => void processTranscript()}
				disabled={!(inputMode === "record" ? transcript : typedNote).trim() || view === "structuring"}
			>
				Create note
			</button>
			{view === "structuring" && <p role="status">Structuring your note...</p>}
			{structureError && (
				<div className="space-y-2 text-sm text-red-600" role="alert">
					<p>{structureError}</p>
					<button type="button" className="border border-gray-300 px-4 py-2 text-gray-900" onClick={() => void processTranscript()}>
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
