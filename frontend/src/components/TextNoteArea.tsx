type TextNoteAreaProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function TextNoteArea({ value, onChange }: TextNoteAreaProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Anything you missed? Anything that comes to mind real quick?</h2>
      <textarea
        className="min-h-32 w-full border border-gray-300 p-3"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Add a quick note..."
      />
    </section>
  );
}