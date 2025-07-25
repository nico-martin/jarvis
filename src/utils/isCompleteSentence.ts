const isCompleteSentence = (text: string): boolean => {
  const sentenceEnders = /[.!?]$/;
  return sentenceEnders.test(text.trim());
};

export default isCompleteSentence;
