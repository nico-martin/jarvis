const parseThinkingJsx = (
  input: string
): { thinking: string; content: string } => {
  const startTag = "<think>";
  const endTag = "</think>";

  const startIdx = input.indexOf(startTag);

  if (startIdx === -1) {
    return { thinking: "", content: input };
  }

  const endIdx = input.indexOf(endTag, startIdx + startTag.length);

  if (endIdx === -1) {
    return {
      thinking: input.slice(startIdx + startTag.length),
      content: "",
    };
  }

  const thinking = input.slice(startIdx + startTag.length, endIdx);
  const content = input.slice(endIdx + endTag.length);

  return { thinking, content };
};

export default parseThinkingJsx;
