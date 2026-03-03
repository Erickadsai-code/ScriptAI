import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, FileText, Loader2 } from "lucide-react";

interface KnowledgeFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/webp",
  "audio/mpeg",
  "audio/wav",
];

const KnowledgeFileUpload = () => {
  const { toast } = useToast();
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchFiles = async () => {
    const { data } = await supabase
      .from("knowledge_files")
      .select("id, file_name, file_type, file_size, created_at")
      .order("created_at", { ascending: false });
    setFiles((data as KnowledgeFile[]) || []);
  };

  useEffect(() => { fetchFiles(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    for (const file of Array.from(fileList)) {
      if (file.type.startsWith("video/")) {
        toast({ title: "Error", description: `No se permiten archivos de video: ${file.name}`, variant: "destructive" });
        continue;
      }

      const filePath = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("knowledge-files")
        .upload(filePath, file);

      if (uploadError) {
        toast({ title: "Error", description: uploadError.message, variant: "destructive" });
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("knowledge-files")
        .getPublicUrl(filePath);

      // Extract text for text-based files
      let extractedText = "";
      if (file.type.startsWith("text/") || file.type === "application/json") {
        extractedText = await file.text();
      }

      await supabase.from("knowledge_files").insert({
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
        extracted_text: extractedText || null,
      } as any);
    }

    fetchFiles();
    toast({ title: "Archivos subidos", description: "La base de conocimiento ha sido actualizada." });
    setUploading(false);
    e.target.value = "";
  };

  const deleteFile = async (id: string, fileName: string) => {
    // Find the storage path
    const { data: fileData } = await supabase
      .from("knowledge_files")
      .select("file_url")
      .eq("id", id)
      .single();

    if (fileData) {
      const url = (fileData as any).file_url as string;
      const path = url.split("/knowledge-files/").pop();
      if (path) {
        await supabase.storage.from("knowledge-files").remove([path]);
      }
    }

    await supabase.from("knowledge_files").delete().eq("id", id);
    fetchFiles();
    toast({ title: "Archivo eliminado" });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="cursor-pointer">
          <input
            type="file"
            multiple
            accept={ALLOWED_TYPES.join(",")}
            onChange={handleUpload}
            className="hidden"
          />
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Subiendo..." : "Subir Archivos"}
          </div>
        </label>
        <span className="text-xs text-muted-foreground">PDF, TXT, DOC, Excel, imágenes, audio (sin video)</span>
      </div>

      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f) => (
            <div key={f.id} className="flex items-center justify-between p-2 rounded bg-secondary/30">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{f.file_name}</span>
                <span className="text-xs text-muted-foreground shrink-0">{formatSize(f.file_size)}</span>
              </div>
              <Button size="sm" variant="ghost" className="text-destructive shrink-0" onClick={() => deleteFile(f.id, f.file_name)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KnowledgeFileUpload;
