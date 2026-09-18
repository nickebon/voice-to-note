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
				<p className="text-sm text-gray-600">Optionally customize the format for this note.</p>
			</div>
			<button
				type="button"
				className="text-sm underline underline-offset-2"
				aria-expanded={isExpanded}
				aria-controls="note-format-instruction"
				onClick={() => onExpandedChange(!isExpanded)}
			>
				{isExpanded ? "Use default note format" : "Customize note format"}
			</button>
			{isExpanded ? (
				<label className="block space-y-2" htmlFor="note-format-instruction">
					<span>Formatting guidance for this note</span>
					<textarea
						id="note-format-instruction"
						className="min-h-32 w-full border border-gray-300 p-3"
						value={instruction}
						onChange={(event) => onInstructionChange(event.target.value)}
						placeholder="I want it in this format: ..."
					/>
				</label>
			) : null}
		</section>
	);
}
