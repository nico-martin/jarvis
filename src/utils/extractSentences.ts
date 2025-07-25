const extractSentences = (text: string): string[] => {
  if (!text || text.trim().length === 0) {
    return [];
  }
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

  // Split on sentence-ending punctuation followed by whitespace or end of string
  const sentenceRegex = /([.!?]+)(\s+|$)/g;
  const parts: string[] = [];
  let lastIndex = 0;
  let match;

  while ((match = sentenceRegex.exec(text)) !== null) {
    const endPunctuation = match[1];
    const followingWhitespace = match[2];
    const sentenceEnd = match.index + endPunctuation.length;

    // Extract the potential sentence
    const potentialSentence = text.substring(lastIndex, sentenceEnd).trim();

    if (potentialSentence.length === 0) {
      continue;
    }

    // Check if this is likely a real sentence ending
    let isRealSentenceEnd = true;

    // Handle ellipsis - if we have 3 or more dots, it's likely not a sentence end
    if (endPunctuation.includes(".") && endPunctuation.length >= 3) {
      isRealSentenceEnd = false;
    }
    // Handle single dots - check for abbreviations
    else if (endPunctuation === ".") {
      // Look for word before the period
      const beforePeriod = potentialSentence.substring(
        0,
        potentialSentence.length - 1
      );
      const lastWordMatch = beforePeriod.match(/\b(\w+)$/i);

      if (lastWordMatch) {
        const lastWord = lastWordMatch[1].toLowerCase();

        // Check if it's a known abbreviation
        if (abbreviations.has(lastWord)) {
          isRealSentenceEnd = false;
        }
        // Check for initials (single letters)
        else if (lastWord.length === 1) {
          isRealSentenceEnd = false;
        }
        // Check for numbers (decimal numbers, versions, etc.)
        else if (/^\d+$/.test(lastWord)) {
          // Look ahead to see if next character after whitespace is a digit
          const nextChar = text.charAt(
            sentenceEnd + followingWhitespace.length
          );
          if (/\d/.test(nextChar)) {
            isRealSentenceEnd = false;
          }
        }
      }

      // Additional check: if the next word starts with lowercase, probably not sentence end
      if (isRealSentenceEnd && followingWhitespace.trim().length > 0) {
        const nextWordStart = sentenceEnd + followingWhitespace.length;
        const nextChar = text.charAt(nextWordStart);
        if (nextChar && /[a-z]/.test(nextChar)) {
          isRealSentenceEnd = false;
        }
      }
    }

    if (isRealSentenceEnd) {
      parts.push(potentialSentence);
      lastIndex = sentenceEnd + followingWhitespace.length;
    }
  }

  // Add any remaining text only if it appears to be a complete sentence
  const remainingText = text.substring(lastIndex).trim();
  if (remainingText.length > 0) {
    // Check if the remaining text ends with sentence-ending punctuation
    if (/[.!?]+$/.test(remainingText)) {
      // If it ends with a period, check if it's likely an abbreviation
      if (remainingText.endsWith(".")) {
        const beforePeriod = remainingText.substring(
          0,
          remainingText.length - 1
        );
        const lastWordMatch = beforePeriod.match(/\b(\w+)$/i);

        let isCompletesentence = true;

        if (lastWordMatch) {
          const lastWord = lastWordMatch[1].toLowerCase();

          // If it's a known abbreviation or single letter, it's likely incomplete
          if (abbreviations.has(lastWord) || lastWord.length === 1) {
            isCompletesentence = false;
          }
        }

        if (isCompletesentence) {
          parts.push(remainingText);
        }
      } else {
        // Ends with ! or ?, definitely complete
        parts.push(remainingText);
      }
    }
    // If it doesn't end with punctuation, it's likely incomplete - don't include it
  }

  return parts.filter((sentence) => sentence.length > 0);
};

export default extractSentences;
