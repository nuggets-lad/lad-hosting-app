"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Bot, User } from "lucide-react";

// Define types compatible with WebsiteDetailTabs
type GlobalFields = {
  brand: string;
  pretty_link: string;
  domain: string;
  ref: string;
  logo: string;
  banner: string;
  banner_mobile: string;
  image_1: string;
  image_2: string;
  image_3: string;
  image_4: string;
  locale: string;
  favicon: string;
  global_code_after_head_open: string;
  global_code_after_body_open: string;
  [key: string]: string | undefined;
};

interface AiAssistantProps {
  globalFields: GlobalFields;
  setGlobalFields: (fields: GlobalFields) => void;
  siteframeContent: string;
  setSiteframeContent: (content: string) => void;
}

export type Message = {
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
};

interface AiAssistantProps {
  globalFields: GlobalFields;
  setGlobalFields: (fields: GlobalFields) => void;
  siteframeContent: string;
  setSiteframeContent: (content: string) => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function AiAssistant({
  globalFields,
  setGlobalFields,
  siteframeContent,
  setSiteframeContent,
  messages,
  setMessages,
}: AiAssistantProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isLoading) {
      setTimer(0);
      timerIntervalRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      setTimer(0);
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isLoading]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      await processChat([...messages, userMessage], siteframeContent);
    } catch (error) {
      console.error("Chat error:", error);
      let errorMessage = "Вибачте, сталася помилка. Спробуйте ще раз.";
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        errorMessage = "Помилка з'єднання або тайм-аут. Можливо, контент сайту занадто великий або сервер довго відповідає.";
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorMessage },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const processChat = async (chatHistory: Message[], currentSiteframeContent: string) => {
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: chatHistory,
        websiteContext: {
            ...globalFields,
            siteframeContentLength: currentSiteframeContent.length,
            siteframeContent: currentSiteframeContent
        },
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    const assistantMessage = data.choices[0].message;
    setMessages((prev) => [...prev, assistantMessage]);

    if (assistantMessage.tool_calls) {
      const toolMessages: Message[] = [];
      let updatedContent = currentSiteframeContent;
      
      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        let result = "Success";

        if (functionName === "update_global_fields") {
          setGlobalFields({ ...globalFields, ...args });
          result = `Updated global fields: ${Object.keys(args).join(", ")}`;
        } else if (functionName === "update_siteframe_content") {
          if (args.full_content) {
             updatedContent = args.full_content;
             setSiteframeContent(updatedContent);
             result = "Updated siteframe content (Full Rewrite)";
          } else if (args.search && args.replace !== undefined) {
             if (updatedContent.includes(args.search)) {
                updatedContent = updatedContent.replace(args.search, args.replace);
                setSiteframeContent(updatedContent);
                result = "Updated siteframe content (Search & Replace)";
             } else {
                result = "Error: Could not find the exact search text in the content. Please ensure whitespace and characters match exactly.";
             }
          } else {
             result = "Error: Invalid parameters. Provide either 'full_content' or 'search' and 'replace'.";
          }
        }

        toolMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: functionName,
          content: result,
        });
      }

      // Recursively call to get final response after tool execution
      await processChat([...chatHistory, assistantMessage, ...toolMessages], updatedContent);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border-l border-white/10">
      <div className="p-4 border-b border-white/10 bg-slate-900/50">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Bot className="w-5 h-5 text-emerald-400" />
          ШІ Асистент
        </h2>
        <p className="text-xs text-slate-400">Допомагає редагувати контент та налаштування</p>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg, idx) => {
            if (msg.role === "system" || msg.role === "tool") return null;

            let displayContent = msg.content;
            
            // If content is empty but there are tool calls, generate a description
            if (!displayContent && msg.tool_calls && msg.tool_calls.length > 0) {
               const descriptions = msg.tool_calls.map((tool: any) => {
                  try {
                    const args = JSON.parse(tool.function.arguments);
                    if (tool.function.name === "update_global_fields") {
                      return `📝 Оновлено поля: ${Object.keys(args).join(", ")}`;
                    }
                    if (tool.function.name === "update_siteframe_content") {
                      return `📝 Оновлено код сайту`;
                    }
                    return `⚙️ Виконано: ${tool.function.name}`;
                  } catch (e) {
                    return `⚙️ Виконано дію`;
                  }
               });
               displayContent = descriptions.join("\n");
            }

            if (!displayContent) return null;

            return (
              <div
                key={idx}
                className={`flex gap-3 ${
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "user" ? "bg-slate-700" : "bg-emerald-900/50"
                  }`}
                >
                  {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-emerald-400" />}
                </div>
                <div
                  className={`rounded-2xl px-4 py-2 max-w-[80%] text-sm ${
                    msg.role === "user"
                      ? "bg-slate-800 text-white whitespace-pre-wrap"
                      : "bg-slate-900/80 text-slate-200 border border-white/5 overflow-hidden"
                  }`}
                >
                  {msg.role === "user" ? (
                    displayContent
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        pre: ({ children }) => <>{children}</>,
                        code({ className, children, ...props }: any) {
                          const content = String(children).replace(/\n$/, "");
                          const match = /language-(\w+)/.exec(className || "");
                          const isBlock = match || content.includes("\n");

                          if (isBlock) {
                            return (
                              <div className="rounded-md bg-slate-950 border border-white/10 my-2 overflow-hidden">
                                <div className="px-3 py-1.5 bg-white/5 border-b border-white/5 text-xs text-slate-400 font-mono flex justify-between">
                                  <span>{match ? match[1] : "code"}</span>
                                </div>
                                <div className="p-3 overflow-x-auto">
                                  <pre className="m-0 p-0 bg-transparent">
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  </pre>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <code
                              className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300 font-mono text-xs"
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {displayContent || ""}
                    </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex gap-3">
               <div className="w-8 h-8 rounded-full bg-emerald-900/50 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-emerald-400" />
               </div>
               <div className="bg-slate-900/80 rounded-2xl px-4 py-2 border border-white/5 flex items-center gap-3">
                 <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                 <span className="text-xs text-slate-500 font-mono">{formatTime(timer)}</span>
               </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-white/10 bg-slate-900/50">
        <div className="relative rounded-xl border border-white/10 bg-slate-950 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex flex-col"
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Напишіть повідомлення..."
              className="min-h-[80px] w-full resize-none border-0 bg-transparent p-3 text-sm focus-visible:outline-none focus-visible:ring-0 shadow-none placeholder:text-slate-500"
              disabled={isLoading}
            />
            <div className="flex justify-between items-center p-2 pt-0">
               <p className="text-[10px] text-slate-500 pl-1">
                Enter для відправки, Shift+Enter для переносу
              </p>
              <Button 
                type="submit" 
                disabled={isLoading || !input.trim()} 
                className="h-8 w-8 shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition-colors p-0 text-white"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
