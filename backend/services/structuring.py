from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI


backend_path = Path(__file__).resolve().parent.parent
load_dotenv(backend_path / ".env")
client = OpenAI()

with (backend_path / "prompts" / "structuring_prompt.txt").open() as prompt_file:
	structuring_prompt = prompt_file.read()


def structure_transcript(transcript):
	completion = client.chat.completions.create(
		model="gpt-4o-mini",
		messages=[
			{
				"role": "system",
				"content": "You turn voice transcripts into readable personal session notes.",
			},
			{
				"role": "user",
				"content": structuring_prompt + transcript,
			},
		],
	)

	return completion.choices[0].message.content or ""
