from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI


load_dotenv(Path(__file__).resolve().parent.parent / ".env")
client = OpenAI()


def transcribe_audio(audio_file):
	transcription = client.audio.transcriptions.create(
		model="whisper-1",
		file=audio_file,
		response_format="verbose_json",
		timestamp_granularities=["segment"],
	)

	segments = []
	for segment in getattr(transcription, "segments", None) or []:
		segments.append(
			{
				"text": getattr(segment, "text", "").strip(),
				"start": getattr(segment, "start", None),
				"end": getattr(segment, "end", None),
				"avg_logprob": getattr(segment, "avg_logprob", None),
				"no_speech_prob": getattr(segment, "no_speech_prob", None),
			}
		)

	return transcription.text, segments
