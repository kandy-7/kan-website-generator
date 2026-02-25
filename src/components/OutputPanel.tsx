import { useState, useMemo } from "react";
import { Monitor, Code2, Copy, Check, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import PreviewToolbar from "./PreviewToolbar";
import { cn } from "@/lib/utils";

type DeviceView = "desktop" | "tablet" | "mobile";

interface OutputPanelProps {
  codeContent: string;
}

// Detect if the code is HTML/web content or a non-web language like Python
function detectLanguage(code: string): "html" | "python" | "other" {
  const lowerCode = code.toLowerCase();

  // Robust HTML/Web detection: if it contains these tags anywhere, it's likely a web page
  if (
    lowerCode.includes("<html") ||
    lowerCode.includes("<!doctype") ||
    lowerCode.includes("<body") ||
    lowerCode.includes("<script") ||
    lowerCode.includes("<style") ||
    (lowerCode.includes("<div") && lowerCode.includes("class=")) ||
    (lowerCode.includes("<section") && lowerCode.includes("class="))
  ) {
    return "html";
  }

  const trimmed = code.trim().toLowerCase();
  if (
    trimmed.startsWith("import ") ||
    trimmed.startsWith("from ") ||
    trimmed.startsWith("def ") ||
    trimmed.startsWith("class ") ||
    trimmed.includes("print(") ||
    trimmed.startsWith("# ")
  ) {
    return "python";
  }
  return "other";
}

// Build a full HTML document from code for the iframe
function buildIframeSrc(code: string, lang: string): string {
  if (lang === "html") {
    // If it's already a full HTML doc, use it directly
    if (code.trim().toLowerCase().startsWith("<!doctype") || code.trim().toLowerCase().startsWith("<html")) {
      return code;
    }
    // Otherwise wrap it in an HTML shell
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  ${code}
</body>
</html>`;
  }

  // For non-HTML code, render it in a styled terminal view inside the iframe
  const escapedCode = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #1a1a2e;
      color: #e0e0e0;
      font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
      padding: 24px;
      min-height: 100vh;
    }
    .terminal-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #333;
    }
    .dot { width: 12px; height: 12px; border-radius: 50%; }
    .dot-red { background: #ff5f57; }
    .dot-yellow { background: #febc2e; }
    .dot-green { background: #28c840; }
    .terminal-title {
      color: #888;
      font-size: 13px;
      margin-left: 8px;
    }
    .lang-badge {
      background: #16213e;
      color: #0abde3;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    pre {
      font-size: 14px;
      line-height: 1.7;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .line {
      display: flex;
    }
    .line-num {
      color: #555;
      min-width: 40px;
      text-align: right;
      padding-right: 16px;
      user-select: none;
    }
    .line-content {
      flex: 1;
    }
    /* Python syntax highlighting */
    .kw { color: #c678dd; }
    .str { color: #98c379; }
    .num { color: #d19a66; }
    .comment { color: #5c6370; font-style: italic; }
    .func { color: #61afef; }
    .builtin { color: #e5c07b; }
  </style>
</head>
<body>
  <div class="terminal-header">
    <span class="dot dot-red"></span>
    <span class="dot dot-yellow"></span>
    <span class="dot dot-green"></span>
    <span class="terminal-title">Code Output</span>
    <span class="lang-badge">${lang}</span>
  </div>
  <pre>${escapedCode.split('\n').map((line, i) =>
    `<div class="line"><span class="line-num">${i + 1}</span><span class="line-content">${line || '&nbsp;'}</span></div>`
  ).join('')}</pre>
</body>
</html>`;
}

const OutputPanel = ({ codeContent }: OutputPanelProps) => {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);
  const [deviceView, setDeviceView] = useState<DeviceView>("desktop");
  const [currentPath, setCurrentPath] = useState("/");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenExternal = () => {
    const lang = detectLanguage(codeContent);
    const html = buildIframeSrc(codeContent, lang);
    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    }
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const getDeviceWidth = () => {
    switch (deviceView) {
      case "mobile":
        return "max-w-[375px]";
      case "tablet":
        return "max-w-[768px]";
      default:
        return "max-w-full";
    }
  };

  const lang = useMemo(() => detectLanguage(codeContent), [codeContent]);
  const iframeSrc = useMemo(() => buildIframeSrc(codeContent, lang), [codeContent, lang]);

  // Simple syntax highlighting for the code tab
  const highlightCode = (code: string) => {
    const lines = code.split("\n");
    return lines.map((line, index) => {
      let highlighted = line
        .replace(
          /\b(const|let|var|function|return|import|export|from|default|if|else|for|while|class|extends|new|this|async|await|def|print|True|False|None)\b/g,
          '<span class="code-keyword">$1</span>'
        )
        .replace(
          /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
          '<span class="code-string">$&</span>'
        )
        .replace(
          /(\/\/.*$|#.*$)/gm,
          '<span class="code-comment">$1</span>'
        );

      return (
        <div key={index} className="flex">
          <span className="code-line-number w-12 text-right pr-4 select-none">
            {index + 1}
          </span>
          <span
            dangerouslySetInnerHTML={{ __html: highlighted || "&nbsp;" }}
            className="flex-1"
          />
        </div>
      );
    });
  };

  const hasCode = codeContent.trim().length > 0;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Tab Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-4">
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
          <button
            onClick={() => setActiveTab("preview")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
              activeTab === "preview"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {lang === "html" ? (
              <Monitor className="w-4 h-4" />
            ) : (
              <Terminal className="w-4 h-4" />
            )}
            Preview
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
              activeTab === "code"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Code2 className="w-4 h-4" />
            Code
          </button>
        </div>

        {activeTab === "preview" && (
          <PreviewToolbar
            currentView={deviceView}
            onViewChange={setDeviceView}
            currentPath={currentPath}
            onPathChange={setCurrentPath}
            onOpenExternal={handleOpenExternal}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === "code" && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden bg-muted/30">
        {activeTab === "preview" ? (
          hasCode ? (
            <div className="h-full flex justify-center p-0">
              <div
                key={refreshKey}
                className={cn(
                  "w-full h-full transition-all duration-300",
                  getDeviceWidth()
                )}
              >
                <iframe
                  srcDoc={iframeSrc}
                  className="w-full h-full border-0 rounded-b-xl bg-white"
                  sandbox="allow-scripts"
                  title="Code Preview"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No Preview Yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Start a conversation to generate your code. The preview will appear here automatically.
              </p>
            </div>
          )
        ) : (
          <div className="h-full overflow-auto custom-scrollbar code-editor p-4">
            <pre className="leading-relaxed">
              {highlightCode(codeContent)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputPanel;
