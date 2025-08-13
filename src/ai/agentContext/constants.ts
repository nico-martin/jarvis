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
