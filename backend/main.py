from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel

from services.structuring import structure_transcript
from services.transcription import transcribe_audio


app = FastAPI()


class TranscriptRequest(BaseModel):
	transcript: str
	quick_note: str | None = None
	structure_instruction: str | None = None


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
	transcript, segments = transcribe_audio(file.file, file.filename, file.content_type)
	return {"transcript": transcript, "segments": segments}


@app.post("/structure")
async def structure(request: TranscriptRequest):
	structured_note = structure_transcript(
		request.transcript,
		request.quick_note,
		request.structure_instruction,
	)
	return {"structured_note": structured_note}
