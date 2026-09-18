import { useEffect, useRef, useState } from "react";

import { transcribeAudio } from "../api";

type UploadAreaProps = {
	onTranscript: (transcript: string) => void;
};

export default function UploadArea({ onTranscript }: UploadAreaProps) {
	const [file, setFile] = useState<File | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [isComplete, setIsComplete] = useState(false);
	const [error, setError] = useState("");
	const [isDragging, setIsDragging] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const abortControllerRef = useRef<AbortController | null>(null);

	useEffect(() => {
		return () => abortControllerRef.current?.abort();
	}, []);

	const selectFile = async (selectedFile: File) => {
		abortControllerRef.current?.abort();
		setFile(selectedFile);
		setIsProcessing(true);
		setIsComplete(false);
		setError("");
		onTranscript("");

		const abortController = new AbortController();
		abortControllerRef.current = abortController;

		try {
			const result = await transcribeAudio(selectedFile, abortController.signal);
			onTranscript(result.transcript);
			setIsComplete(true);
		} catch (requestError) {
			if (requestError instanceof DOMException && requestError.name === "AbortError") {
				return;
			}
			setError(requestError instanceof Error ? requestError.message : "Unable to transcribe this file.");
		} finally {
			if (abortControllerRef.current === abortController) {
				abortControllerRef.current = null;
				setIsProcessing(false);
			}
		}
	};

	const cancelUpload = () => {
		abortControllerRef.current?.abort();
		abortControllerRef.current = null;
		setFile(null);
		setIsProcessing(false);
		setIsComplete(false);
		setError("");
		onTranscript("");
		if (inputRef.current) {
			inputRef.current.value = "";
		}
	};

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = event.target.files?.[0];
		if (selectedFile) {
			void selectFile(selectedFile);
		}
	};

	return (
		<div className="space-y-3">
			<div
				className={`border-2 border-dashed p-6 text-center ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"}`}
				onDragOver={(event) => {
					event.preventDefault();
					setIsDragging(true);
				}}
				onDragLeave={() => setIsDragging(false)}
				onDrop={(event) => {
					event.preventDefault();
					setIsDragging(false);
					const droppedFile = event.dataTransfer.files[0];
					if (droppedFile) {
						void selectFile(droppedFile);
					}
				}}
			>
				{!file && <p className="text-gray-600">Drop an audio file here or <button type="button" className="text-blue-600 underline" onClick={() => inputRef.current?.click()}>browse files</button></p>}
				{file && (
					<div className="flex items-center justify-center gap-3">
						<span>{file.name}</span>
						{isProcessing && <button type="button" className="text-red-600 underline" onClick={cancelUpload}>X</button>}
						{isComplete && <span className="text-green-600" aria-label="Upload complete">&#10003;</span>}
					</div>
				)}
				{isProcessing && <p className="mt-3 text-sm text-gray-600">Uploading and transcribing...</p>}
				{isProcessing && <div className="mt-2 h-2 w-full overflow-hidden bg-gray-200"><div className="h-full w-1/3 animate-pulse bg-blue-500" /></div>}
				<input ref={inputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileChange} />
			</div>
			{error && <p className="text-sm text-red-600" role="alert">{error}</p>}
		</div>
	);
}
