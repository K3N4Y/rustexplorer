import SyntaxHighlighter from "react-syntax-highlighter";
import { github, atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { useTheme } from "../../theme-provider";
import type { PreviewPayload } from "../types";

type JsonPayload = Extract<PreviewPayload, { type: "json" }>;

function getIsDark(theme: string): boolean {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return theme === "dark";
}

export default function JsonRenderer({ payload }: { payload: JsonPayload }) {
  const { content, isArray, truncated } = payload;
  const { theme } = useTheme();
  const isDark = getIsDark(theme);

  return (
    <div className="h-full flex flex-col rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted border-b border-border">
        <span className="text-[10px] font-mono uppercase text-muted-foreground">
          {isArray ? "JSON Array" : "JSON Object"}
        </span>
        {truncated && (
          <span className="text-[10px] text-yellow-600">
            Preview truncado
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        <SyntaxHighlighter
          language="json"
          style={isDark ? atomOneDark : github}
          customStyle={{
            margin: 0,
            padding: "1rem",
            fontSize: "13px",
            borderRadius: 0,
            background: "transparent",
          }}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
