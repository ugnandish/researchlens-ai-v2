import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export async function extractTextFromDocument(
  file: File
): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf") {
    const parser = new PDFParse({
      data: buffer,
    });

    const result = await parser.getText();

    return result.text.trim();
  }

  if (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.toLowerCase().endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({
      buffer,
    });

    return result.value.trim();
  }

  if (file.type === "text/plain") {
    return buffer.toString("utf-8").trim();
  }

  throw new Error(
    "Unsupported file type. Please upload a PDF, DOCX, or TXT file."
  );
}