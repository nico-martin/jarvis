const isFullSentence = (snippet: string): string | null => {
  // Common abbreviations that end with periods but don't end sentences
  const abbreviations = new Set([
    "mr",
    "mrs",
    "ms",
    "dr",
    "prof",
    "sr",
    "jr",
    "vs",
    "etc",
    "inc",
    "ltd",
    "corp",
    "co",
    "st",
    "ave",
    "blvd",
    "rd",
    "dept",
    "univ",
    "assn",
    "bros",
    "ph.d",
    "m.d",
    "b.a",
    "m.a",
    "phd",
    "md",
    "ba",
    "ma",
    "bsc",
    "msc",
    "llb",
    "llm",
    "a.m",
    "p.m",
    "am",
    "pm",
    "e.g",
    "i.e",
    "cf",
    "et",
    "al",
    "ibid",
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ]);

  // Trim whitespace
  const trimmed = snippet.trim();

  // Check if empty
  if (!trimmed) {
    return null;
  }

  // Check if it ends with proper sentence-ending punctuation
  const endsWithPunctuation = /[.!?]$/.test(trimmed);

  if (!endsWithPunctuation) {
    return null;
  }

  // If it ends with a period, check if it's likely an abbreviation
  if (trimmed.endsWith(".")) {
    const beforePeriod = trimmed.substring(0, trimmed.length - 1);
    const lastWordMatch = beforePeriod.match(/\b(\w+)$/i);

    if (lastWordMatch) {
      const lastWord = lastWordMatch[1].toLowerCase();
      
      // Check if it's a known abbreviation
      if (abbreviations.has(lastWord)) {
        return null;
      }
      
      // Check for initials (single letters)
      if (lastWord.length === 1) {
        return null;
      }
    }
  }

  // Check if it starts with a capital letter or number
  const startsCorrectly = /^[A-Z0-9"'(]/.test(trimmed);

  if (!startsCorrectly) {
    return null;
  }

  // Check if it contains at least one word (letters/numbers)
  const hasWords = /[a-zA-Z0-9]/.test(trimmed);

  if (!hasWords) {
    return null;
  }

  // Basic check for balanced quotes (simple version)
  const quoteCount = (trimmed.match(/"/g) || []).length;
  const singleQuoteCount = (trimmed.match(/'/g) || []).length;

  // If quotes exist, they should be balanced (even number)
  if (quoteCount % 2 !== 0) {
    return null;
  }

  return trimmed;
};

export default isFullSentence;
