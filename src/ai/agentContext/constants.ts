// Silence before the VAD treats speech as finished, and how much trailing audio
// it keeps afterwards (vad-recorder defaults: 1000 / 300).
export const VAD_MIN_SILENCE_MS = 500;
export const VAD_APPEND_SILENCE_MS = 100;

export const FILL_WORDS = [
  // Non-speech sounds
  "(laughs)",
  "(laughter)",
  "(chuckles)",
  "(coughs)",
  "(clears throat)",
  "(sighs)",
  "(sniffs)",
  "(breathing)",
  "(inhales)",
  "(exhales)",
  "(applause)",
  "(music)",
  "(silence)",
  "(wooshing)",

  // Whisper-specific artifacts
  "[BLANK_AUDIO]",
  "[Music]",
  "[Applause]",
  "[Laughter]",
  "[Silence]",
  "[Inaudible]",
  "[Background noise]",
].map((s) => s.toLowerCase());
