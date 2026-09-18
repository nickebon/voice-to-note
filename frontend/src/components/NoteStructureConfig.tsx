type NoteStructureConfigProps = {
	instruction: string;
	isExpanded: boolean;
	onInstructionChange: (instruction: string) => void;
	onExpandedChange: (isExpanded: boolean) => void;
};

export default function NoteStructureConfig({
	instruction,
	isExpanded,
	onInstructionChange,
	onExpandedChange,
}: NoteStructureConfigProps) {
	return (
		<section className="space-y-3">
			<div>
				<h2 className="text-lg font-semibold">Note structure</h2>
				<p className="text-sm text-gray-600">Formatting guidance for this note.</p>
			</div>
			<div className="border border-gray-300 bg-[#faf8f2]">
				<button
					type="button"
					className="flex w-full items-center justify-between px-3 py-2 text-left"
					aria-expanded={isExpanded}
					aria-controls="note-format-content"
					onClick={() => onExpandedChange(!isExpanded)}
				>
					<span>Customise note format</span>
					<svg
						className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						aria-hidden="true"
					>
						<path d="m3 6 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</button>
				{isExpanded ? (
					<div id="note-format-content" className="border-t border-gray-300 p-3">
						<label className="block space-y-2" htmlFor="note-format-instruction">
							<span>How should this note be formatted?</span>
							<textarea
								id="note-format-instruction"
								className="min-h-32 w-full border border-gray-300 p-3"
								value={instruction}
								onChange={(event) => onInstructionChange(event.target.value)}
								placeholder="I want it in this format: ..."
							/>
						</label>
					</div>
				) : null}
			</div>
		</section>
	);
}
