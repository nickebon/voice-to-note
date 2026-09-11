import { FormEvent, useState } from "react";

type ApiKeySetupProps = {
	hasStoredApiKey: boolean;
	isSaving: boolean;
	errorMessage: string;
	onSave: (apiKey: string) => Promise<void>;
	onClear?: () => Promise<void>;
};

export default function ApiKeySetup({
	hasStoredApiKey,
	isSaving,
	errorMessage,
	onSave,
	onClear,
}: ApiKeySetupProps) {
	const [apiKey, setApiKey] = useState("");

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		await onSave(apiKey);
	};

	return (
		<main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-10">
			<section className="w-full space-y-5 border border-gray-300 bg-white/80 p-6 shadow-sm">
				<div className="space-y-2">
					<h1 className="text-2xl font-bold">Enter your OpenAI API key to get started</h1>
					<p className="text-sm text-slate-700">
						Your key will be encrypted and remembered on this device for future launches.
					</p>
				</div>
				<form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
					<label className="block space-y-2">
						<span className="text-sm">OpenAI API key</span>
						<input
							type="password"
							value={apiKey}
							onChange={(event) => setApiKey(event.target.value)}
							autoComplete="off"
							className="w-full border border-gray-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-500"
							placeholder="sk-..."
						/>
					</label>
					<button
						type="submit"
						disabled={isSaving || !apiKey.trim()}
						className="border border-gray-300 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isSaving ? "Saving..." : "Save"}
					</button>
				</form>
				{hasStoredApiKey && onClear ? (
					<button
						type="button"
						onClick={() => void onClear()}
						className="text-sm underline underline-offset-2"
					>
						Clear saved key
					</button>
				) : null}
				{errorMessage ? (
					<p className="text-sm text-red-600" role="alert">
						{errorMessage}
					</p>
				) : null}
			</section>
		</main>
	);
}
