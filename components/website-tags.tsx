"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, X, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function WebsiteTags({ 
  websiteId, 
  initialTags = [], 
  availableTags = [] 
}: { 
  websiteId: string; 
  initialTags: string[];
  availableTags?: string[];
}) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const supabase = createClientComponentClient();
  const router = useRouter();

  const toggleTag = async (tagToToggle: string) => {
    const trimmedTag = tagToToggle.trim();
    if (!trimmedTag) return;

    let updatedTags: string[];
    
    if (tags.includes(trimmedTag)) {
      updatedTags = tags.filter(t => t !== trimmedTag);
    } else {
      updatedTags = [...tags, trimmedTag];
    }

    setTags(updatedTags);
    setInputValue("");

    await supabase
      .from("websites")
      .update({ tags: updatedTags })
      .eq("uuid", websiteId);
    
    router.refresh();
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div 
          role="button"
          tabIndex={0}
          className="flex flex-wrap items-center gap-1 cursor-pointer min-h-[24px] hover:bg-white/5 rounded px-1 -ml-1 transition-colors outline-none focus-visible:ring-1 focus-visible:ring-slate-700"
        >
          {tags.length === 0 && (
            <Badge 
              variant="outline" 
              className="border-dashed border-slate-700 bg-transparent text-xs text-slate-500 hover:border-slate-600 hover:text-slate-400"
            >
              <Plus className="h-3 w-3 mr-1" />
              Tag
            </Badge>
          )}
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0 bg-slate-950 border-slate-800" align="start">
        <Command className="bg-slate-950 text-slate-200">
          <CommandInput 
            placeholder="Search or add tag..." 
            value={inputValue}
            onValueChange={setInputValue}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty className="py-2 px-2 text-xs text-slate-500">
              {inputValue.trim() ? (
                <button 
                  className="w-full text-left px-2 py-1 hover:bg-slate-900 rounded text-amber-400"
                  onClick={() => toggleTag(inputValue)}
                >
                  Create "{inputValue}"
                </button>
              ) : (
                "No tags found."
              )}
            </CommandEmpty>
            <CommandGroup heading="Tags" className="text-slate-400">
              {availableTags.map((tag) => (
                <CommandItem
                  key={tag}
                  value={tag}
                  onSelect={() => toggleTag(tag)}
                  className="text-slate-200 aria-selected:bg-slate-900 aria-selected:text-white"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      tags.includes(tag) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {tag}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
