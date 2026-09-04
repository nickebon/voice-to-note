from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel

from services.structuring import structure_transcript
from services.transcription import transcribe_audio


app = FastAPI()


class TranscriptRequest(BaseModel):
	transcript: str


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
	transcript, segments = transcribe_audio(file.file)
	return {"transcript": transcript, "segments": segments}


@app.post("/structure")
async def structure(request: TranscriptRequest):
	structured_note = structure_transcript(request.transcript)
	return {"structured_note": structured_note}
