import isCompleteSentence from "./isCompleteSentence";

const extractSentences = (text: string): string[] => {
  const sentences: string[] = [];
  let currentSentence = "";
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    currentSentence += char;
    
    // Check if this could be sentence-ending punctuation
    if (/[.!?]/.test(char)) {
      // Look ahead to see if this is truly a sentence ending
      const nextChar = text[i + 1];
      const nextNonSpaceChar = text.slice(i + 1).match(/\S/)?.[0];
      
      // It's a sentence ending if:
      // 1. It's at the end of the text, OR
      // 2. It's followed by whitespace and then a capital letter
      if (i === text.length - 1 || 
          (nextChar === ' ' && nextNonSpaceChar && /[A-Z]/.test(nextNonSpaceChar))) {
        const trimmed = currentSentence.trim();
        if (trimmed.length > 0) {
          sentences.push(trimmed);
          currentSentence = "";
        }
      }
    }
  }
  
  // Add any remaining incomplete sentence
  if (currentSentence.trim().length > 0) {
    sentences.push(currentSentence.trim());
  }
  
  return sentences.filter(s => s.length > 0);
};

export default extractSentences;
