type TypedSessionAreaProps = {
	value: string;
	onChange: (value: string) => void;
};

export default function TypedSessionArea({ value, onChange }: TypedSessionAreaProps) {
	return (
		<section className="space-y-3">
			<label htmlFor="typed-session-note" className="block text-lg font-semibold">
				What happened in the session?
			</label>
			<textarea
				id="typed-session-note"
				className="min-h-32 w-full border border-gray-300 p-3"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder="Type everything from the session — there's no separate field for extra notes here, just include it all."
			/>
		</section>
	);
}
