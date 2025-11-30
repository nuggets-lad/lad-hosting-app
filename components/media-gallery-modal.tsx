"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"
import Image from "next/image"
import { Trash2 } from "lucide-react"

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "uploads";
const STORAGE_FOLDER = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_FOLDER ?? "uploads";

interface MediaUpload {
  id: string
  filename: string
  url: string
  website_uuid: string | null
  created_at: string
}

interface Website {
  uuid: string
  domain: string
}

interface MediaGalleryModalProps {
  onSelect: (url: string) => void
  trigger?: React.ReactNode
  websiteUuid?: string
  pathPrefix?: string
}

const generateFilePath = (prefix: string, originalName: string) => {
  const extension = originalName.split(".").pop()?.toLowerCase() || "png";
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  const cleanedPrefix = prefix.replace(/[^a-z0-9-_]/gi, "-") || "media";
  const folder = STORAGE_FOLDER ? `${STORAGE_FOLDER.replace(/\/+$/u, "")}/` : "";
  return `${folder}${cleanedPrefix}-${Date.now()}-${id}.${extension}`;
};

const optimizeImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    // Skip optimization for non-image files, SVGs, or GIFs (to preserve animation)
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") {
      return resolve(file);
    }

    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          return resolve(file);
        }

        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        
        // Draw image to canvas
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (blob) {
              // Change extension to .webp
              const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
              const optimizedFile = new File([blob], newName, {
                type: "image/webp",
                lastModified: Date.now(),
              });
              resolve(optimizedFile);
            } else {
              // Fallback if blob creation fails
              resolve(file);
            }
          },
          "image/webp",
          0.8
        );
      } catch (e) {
        console.error("Error during image optimization:", e);
        URL.revokeObjectURL(url);
        resolve(file);
      }
    };

    img.onerror = (error) => {
      URL.revokeObjectURL(url);
      // If image loading fails, just return original file
      console.warn("Image optimization failed, using original file", error);
      resolve(file);
    };
  });
};

export function MediaGalleryModal({ onSelect, trigger, websiteUuid, pathPrefix = "media" }: MediaGalleryModalProps) {
  const [open, setOpen] = useState(false)
  const [images, setImages] = useState<MediaUpload[]>([])
  const [websites, setWebsites] = useState<Website[]>([])
  const [search, setSearch] = useState("")
  const [selectedWebsite, setSelectedWebsite] = useState<string>("all")
  const [loading, setLoading] = useState(false)
  
  // Upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (open) {
      fetchImages()
      fetchWebsites()
    }
  }, [open])

  useEffect(() => {
    if (open) {
        fetchImages()
    }
  }, [search, selectedWebsite])

  const fetchImages = async () => {
    setLoading(true)
    let query = supabase
      .from("media_uploads")
      .select("*")
      .order("created_at", { ascending: false })

    if (search) {
      query = query.ilike("filename", `%${search}%`)
    }

    if (selectedWebsite && selectedWebsite !== "all") {
      query = query.eq("website_uuid", selectedWebsite)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching images:", error)
    } else {
      setImages(data || [])
    }
    setLoading(false)
  }

  const fetchWebsites = async () => {
    const { data, error } = await supabase
      .from("websites")
      .select("uuid, domain")
      .order("domain")

    if (error) {
      console.error("Error fetching websites:", error)
    } else {
      setWebsites(data || [])
    }
  }

  const handleSelect = (url: string) => {
    onSelect(url)
    setOpen(false)
  }

  // Upload Logic
  const canUpload = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const resetUploadMessages = () => {
    setUploadMessage(null);
    setUploadError(null);
  };

  const uploadFile = useCallback(
    async (file: File) => {
      if (!canUpload) {
        return;
      }
      setIsUploading(true);
      resetUploadMessages();
      try {
        const optimizedFile = await optimizeImage(file);
        const path = generateFilePath(pathPrefix, optimizedFile.name);
        
        const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, optimizedFile, {
          upsert: false,
          cacheControl: "3600",
          contentType: optimizedFile.type,
        });
        if (uploadError) {
          throw uploadError;
        }
        const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        if (!data?.publicUrl) {
          throw new Error("Не вдалося отримати публічний URL.");
        }

        await supabase.from("media_uploads").insert({
          filename: optimizedFile.name,
          url: data.publicUrl,
          website_uuid: websiteUuid || null,
        });

        setUploadMessage("Зображення успішно завантажено!");
        fetchImages(); // Refresh gallery
      } catch (error) {
        const message = error instanceof Error ? error.message : "Не вдалося завантажити файл.";
        setUploadError(message);
      } finally {
        setIsUploading(false);
      }
    },
    [canUpload, pathPrefix, supabase, websiteUuid]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files && files[0];
      if (!file) {
        return;
      }
      uploadFile(file);
    },
    [uploadFile]
  );

  const handleUploadButtonClick = () => {
    if (!canUpload) {
      return;
    }
    fileInputRef.current?.click();
  };

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLInputElement>) => {
    if (!canUpload) {
      return;
    }
    const items = event.clipboardData?.items;
    if (!items) {
      return;
    }
    const fileItem = Array.from(items).find((item) => item.type.startsWith("image"));
    if (fileItem) {
      event.preventDefault();
      const file = fileItem.getAsFile();
      if (file) {
        uploadFile(file);
      }
    }
  }, [canUpload, uploadFile]);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!canUpload) {
      return;
    }
    event.preventDefault();
    handleFiles(event.dataTransfer?.files ?? null);
  };

  const handleUrlUpload = useCallback(async () => {
    if (!uploadUrl || !uploadUrl.startsWith("http")) return;
    
    try {
      setIsUploading(true);
      resetUploadMessages();

      // Try to fetch and upload the image (if CORS allows)
      try {
        const response = await fetch(uploadUrl);
        if (response.ok) {
          const blob = await response.blob();
          if (blob.type.startsWith("image/")) {
            let filename = "external-image.png";
            try {
              const urlObj = new URL(uploadUrl);
              const pathname = urlObj.pathname;
              const possibleName = pathname.split("/").pop();
              if (possibleName && possibleName.includes(".")) {
                filename = possibleName;
              }
            } catch {}
            
            const file = new File([blob], filename, { type: blob.type });
            await uploadFile(file);
            return;
          }
        }
      } catch (e) {
        console.warn("Could not fetch image client-side (likely CORS), falling back to saving URL", e);
      }

      // Check if image already exists in gallery
      const { data: existing } = await supabase
        .from("media_uploads")
        .select("id")
        .eq("url", uploadUrl)
        .single();

      if (!existing) {
        // Try to extract filename from URL
        let filename = "external-image.png";
        try {
          const urlObj = new URL(uploadUrl);
          const pathname = urlObj.pathname;
          const possibleName = pathname.split("/").pop();
          if (possibleName && possibleName.includes(".")) {
            filename = possibleName;
          }
        } catch {}

        await supabase.from("media_uploads").insert({
          filename,
          url: uploadUrl,
          website_uuid: websiteUuid || null,
        });
        
        setUploadMessage("Посилання збережено в галерею (зовнішнє джерело).");
        fetchImages();
      } else {
        setUploadMessage("Це зображення вже є в галереї.");
      }
    } catch (error) {
      console.warn("Failed to sync external URL to gallery:", error);
      setUploadError("Не вдалося зберегти посилання.");
    } finally {
      setIsUploading(false);
    }
  }, [uploadUrl, canUpload, uploadFile, supabase, websiteUuid]);

  const handleDelete = async (e: React.MouseEvent, image: MediaUpload) => {
    e.stopPropagation();
    if (!confirm("Ви впевнені, що хочете видалити це зображення?")) return;

    const { error } = await supabase.from("media_uploads").delete().eq("id", image.id);
    
    if (error) {
      console.error("Error deleting image:", error);
      alert("Помилка при видаленні зображення");
      return;
    }

    // Try delete from storage if it matches our bucket
    try {
         const storageUrlPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/`;
         if (image.url.startsWith(storageUrlPrefix)) {
             const path = image.url.replace(storageUrlPrefix, "");
             await supabase.storage.from(STORAGE_BUCKET).remove([path]);
         }
    } catch (err) {
        console.warn("Failed to delete file from storage", err);
    }

    fetchImages();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Відкрити галерею</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-white/10">
          <DialogTitle>Медіа Галерея</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="gallery" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="gallery">Галерея</TabsTrigger>
              <TabsTrigger value="upload">Завантажити нове</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="gallery" className="flex-1 flex flex-col overflow-hidden mt-0 p-0">
            <div className="flex gap-4 px-6 py-4 border-b border-white/5">
              <Input 
                placeholder="Пошук за назвою..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1"
              />
              <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Фільтр по сайту" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всі сайти</SelectItem>
                  {websites.map((site) => (
                    <SelectItem key={site.uuid} value={site.uuid}>
                      {site.domain || "Без домену"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="flex-1">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6">
                {images.map((image) => (
                  <div 
                    key={image.id} 
                    className="group relative aspect-square border rounded-md overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary bg-slate-900/50"
                    onClick={() => handleSelect(image.url)}
                  >
                    <Image 
                      src={image.url} 
                      alt={image.filename} 
                      fill 
                      className="object-contain p-2"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs p-2 text-center break-all pointer-events-none">
                      <span className="line-clamp-2">{image.filename}</span>
                    </div>
                    <button 
                      className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-md bg-red-500 text-white shadow-md z-50 hover:bg-red-600 transition-colors border border-white/20"
                      onClick={(e) => handleDelete(e, image)}
                      title="Видалити"
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {images.length === 0 && !loading && (
                  <div className="col-span-full text-center py-10 text-muted-foreground">
                    Зображень не знайдено
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="upload" className="flex-1 p-6 mt-0 overflow-y-auto">
            <div className="max-w-xl mx-auto space-y-8">
              <div 
                className="border-2 border-dashed border-slate-700 rounded-xl p-10 text-center hover:bg-slate-900/50 transition cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={handleUploadButtonClick}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 rounded-full bg-slate-800">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-white">Натисніть для завантаження або перетягніть файл</p>
                    <p className="text-sm text-slate-400 mt-1">SVG, PNG, JPG або GIF</p>
                  </div>
                  <Button variant="secondary" disabled={isUploading}>
                    {isUploading ? "Завантаження..." : "Обрати файл"}
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    handleFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-950 px-2 text-slate-500">Або імпортувати за посиланням</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="https://example.com/image.png" 
                    value={uploadUrl}
                    onChange={(e) => {
                      setUploadUrl(e.target.value);
                      resetUploadMessages();
                    }}
                    onPaste={handlePaste}
                  />
                  <Button onClick={handleUrlUpload} disabled={isUploading || !uploadUrl}>
                    Імпортувати
                  </Button>
                </div>
                
                {uploadMessage && (
                  <div className="p-3 rounded-md bg-emerald-500/10 text-emerald-400 text-sm text-center">
                    {uploadMessage}
                  </div>
                )}
                
                {uploadError && (
                  <div className="p-3 rounded-md bg-red-500/10 text-red-400 text-sm text-center">
                    {uploadError}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
