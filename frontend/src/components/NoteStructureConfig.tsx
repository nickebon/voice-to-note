import { useState } from "react";

type NoteStructureConfigProps = {
  instruction: string;
  referenceFile: File | null;
  onInstructionChange: (instruction: string) => void;
  onReferenceFileChange: (file: File | null) => void;
};

export default function NoteStructureConfig({
  instruction,
  referenceFile,
  onInstructionChange,
  onReferenceFileChange,
}: NoteStructureConfigProps) {
  const [isDragging, setIsDragging] = useState(false);

  const selectReferenceFile = (file: File | undefined) => {
    if (file) {
      onReferenceFileChange(file);
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Note structure</h2>
      <label className="block space-y-2">
        <span>Give an instruction OR Upload a previous note</span>
        <input
          className="w-full border border-gray-300 p-3"
          value={instruction}
          onChange={(event) => onInstructionChange(event.target.value)}
          placeholder="I want it in this format: ..."
        />
      </label>
      <label
        className={`block cursor-pointer border-2 border-dashed p-6 text-center text-gray-600 ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          selectReferenceFile(event.dataTransfer.files[0]);
        }}
      >
        <span>let the AI mimic the rhetoric, structure, and length of this note.</span>
        <input type="file" className="mt-3 block w-full text-sm" onChange={(event) => selectReferenceFile(event.target.files?.[0])} />
        {referenceFile && <span className="mt-2 block text-gray-900">{referenceFile.name}</span>}
      </label>
    </section>
  );
}