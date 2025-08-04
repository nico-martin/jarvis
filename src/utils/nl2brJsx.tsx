import { JSX } from "preact";

const nl2brJsx = (text: string): JSX.Element[] => {
  const lines = text.split("\n");
  // remove leading empty lines
  while (lines.length > 0 && lines[0] === "") {
    lines.shift();
  }
  // remove trailing empty lines
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines.map((line, index) => (
    <span key={index} className="block">
      {line || <br />}
    </span>
  ));
};

export default nl2brJsx;
