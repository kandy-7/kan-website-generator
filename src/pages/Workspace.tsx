import { useState } from "react";
import ChatPanel from "@/components/ChatPanel";
import OutputPanel from "@/components/OutputPanel";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Github, Share2, Moon, Sun, Rocket, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const Workspace = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentCode, setCurrentCode] = useState("");

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:8001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history: messages
        }),
      });

      const data = await res.json();

      const responseText = data.response || data.error || "No response from agent.";
      const responseCode = data.code || "";

      // Update the code editor if code was returned
      if (responseCode) {
        setCurrentCode(responseCode);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseText,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "⚠️ Could not reach the backend. Make sure it is running on http://localhost:8001",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">buildAI Workspace</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2">
            <Share2 className="w-4 h-4" />
            Share
          </Button>
          <Button variant="ghost" size="sm" className="gap-2">
            <Github className="w-4 h-4" />
            GitHub
          </Button>
          <Button variant="outline" size="sm">
            Upgrade
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              setMessages([]);
              setCurrentCode("");
            }}
          >
            <Trash2 className="w-4 h-4" />
            Clear Chat
          </Button>
          <div className="h-6 w-px bg-border" />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>
          <Button size="sm" className="gap-2">
            <Rocket className="w-4 h-4" />
            Publish
          </Button>
        </div>
      </header>

      {/* Main Content - Resizable Panels */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
          <div className="h-full animate-slide-in-left">
            <ChatPanel
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={70}>
          <div className="h-full animate-slide-in-right">
            <OutputPanel
              codeContent={currentCode}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default Workspace;
