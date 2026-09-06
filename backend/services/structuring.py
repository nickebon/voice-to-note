from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI


backend_path = Path(__file__).resolve().parent.parent
load_dotenv(backend_path / ".env")
client = OpenAI()

with (backend_path / "prompts" / "structuring_prompt.txt").open() as prompt_file:
	structuring_prompt = prompt_file.read()


def structure_transcript(transcript, quick_note=None, structure_instruction=None):
	additional_sections = []
	if quick_note and quick_note.strip():
		additional_sections.append(f"Additional notes:\n{quick_note.strip()}")
	if structure_instruction and structure_instruction.strip():
		additional_sections.append(f"Formatting instructions:\n{structure_instruction.strip()}")

	user_content = structuring_prompt + transcript
	if additional_sections:
		user_content += "\n\n" + "\n\n".join(additional_sections)

	completion = client.chat.completions.create(
		model="gpt-4o-mini",
		messages=[
			{
				"role": "system",
				"content": "You turn voice transcripts into readable personal session notes.",
			},
			{
				"role": "user",
				"content": user_content,
			},
		],
	)

	return completion.choices[0].message.content or ""
