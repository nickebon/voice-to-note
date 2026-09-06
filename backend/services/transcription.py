from mimetypes import guess_extension
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI


load_dotenv(Path(__file__).resolve().parent.parent / ".env")
client = OpenAI()

SUPPORTED_AUDIO_EXTENSIONS = {
	"audio/flac": ".flac",
	"audio/mp4": ".mp4",
	"audio/mpeg": ".mp3",
	"audio/ogg": ".ogg",
	"audio/wav": ".wav",
	"audio/webm": ".webm",
}


def transcribe_audio(audio_file, filename=None, content_type=None):
	filename = filename or "audio"
	if "." not in Path(filename).name and content_type:
		mime_type = content_type.split(";", 1)[0]
		extension = SUPPORTED_AUDIO_EXTENSIONS.get(mime_type) or guess_extension(mime_type)
		if extension:
			filename += extension

	transcription = client.audio.transcriptions.create(
		model="whisper-1",
		file=(filename, audio_file, content_type or "application/octet-stream"),
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
