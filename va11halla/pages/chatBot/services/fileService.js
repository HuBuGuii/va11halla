import { buildAttachmentLabel } from "./messageService";

const MAX_TEXT_FILE_CHARS = 12000;
export const MAX_ATTACHMENTS = 4;
export const IMAGE_FILE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "bmp"];
export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
];
export const TEXT_FILE_EXTENSIONS = ["txt", "md", "markdown", "json", "csv", "js", "ts", "html", "css"];
export const PICKABLE_FILE_EXTENSIONS = ["pdf", ...IMAGE_FILE_EXTENSIONS, ...TEXT_FILE_EXTENSIONS];

export function getFileExtension(name = "") {
  const normalized = String(name).toLowerCase();
  const dotIndex = normalized.lastIndexOf(".");
  return dotIndex >= 0 ? normalized.slice(dotIndex + 1) : "";
}

export function getMimeTypeFromName(name = "") {
  const extension = getFileExtension(name);

  if (IMAGE_FILE_EXTENSIONS.includes(extension)) {
    return `image/${extension === "jpg" ? "jpeg" : extension}`;
  }

  if (extension === "pdf") {
    return "application/pdf";
  }

  if (TEXT_FILE_EXTENSIONS.includes(extension)) {
    return "text/plain";
  }

  return "application/octet-stream";
}

export function isSupportedImageType(extension = "", mimeType = "") {
  return IMAGE_FILE_EXTENSIONS.includes(extension) || IMAGE_MIME_TYPES.includes(String(mimeType).toLowerCase());
}

function ensureDataUrl(value, fallbackMimeType) {
  if (typeof value !== "string" || !value.startsWith("data:")) {
    throw new Error("Failed to convert file to base64 data URL");
  }

  if (value.startsWith("data:application/octet-stream") && fallbackMimeType) {
    return value.replace("data:application/octet-stream", `data:${fallbackMimeType}`);
  }

  return value;
}

function decodeBase64Utf8(base64) {
  if (typeof atob === "function") {
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(base64), (char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join("")
    );
  }

  return "";
}

export function readFileAsDataUrl(fileInfo) {
  const fileObject = fileInfo?.file;
  const mimeType = fileInfo?.type || getMimeTypeFromName(fileInfo?.name);

  if (
    typeof FileReader !== "undefined" &&
    fileObject &&
    (typeof Blob !== "undefined" ? fileObject instanceof Blob : true)
  ) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(ensureDataUrl(reader.result, mimeType));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(fileObject);
    });
  }

  if (typeof fetch === "function" && fileInfo?.path && /^blob:|^data:|^https?:|^file:/i.test(fileInfo.path)) {
    return fetch(fileInfo.path)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch local file");
        }
        return response.blob();
      })
      .then(
        (blob) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(ensureDataUrl(reader.result, blob.type || mimeType));
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsDataURL(blob);
          })
      );
  }

  if (typeof uni.getFileSystemManager === "function" && fileInfo?.path) {
    return new Promise((resolve, reject) => {
      uni.getFileSystemManager().readFile({
        filePath: fileInfo.path,
        encoding: "base64",
        success: (res) => {
          resolve(ensureDataUrl(`data:${mimeType};base64,${res.data}`, mimeType));
        },
        fail: () => reject(new Error("Failed to read file")),
      });
    });
  }

  throw new Error("Current platform does not support local file reading");
}

export async function readTextAttachment(fileInfo) {
  const dataUrl = await readFileAsDataUrl(fileInfo);
  const base64 = String(dataUrl).split(",")[1] || "";
  const text = decodeBase64Utf8(base64).slice(0, MAX_TEXT_FILE_CHARS);
  return {
    dataUrl,
    text,
  };
}

export function normalizePickedFile(file, index) {
  if (typeof file === "string") {
    const inferredName = file.split("/").pop()?.split("?")[0] || `file-${Date.now()}-${index + 1}`;
    return {
      name: inferredName,
      extension: getFileExtension(inferredName),
      mimeType: getMimeTypeFromName(inferredName),
      size: 0,
      path: file,
      file: null,
    };
  }

  const name = file.name || `file-${Date.now()}-${index + 1}`;
  const extension = getFileExtension(name);
  const mimeType = file.type || getMimeTypeFromName(name);
  const path = file.path || file.tempFilePath || "";

  return {
    name,
    extension,
    mimeType,
    size: Number(file.size || 0),
    path,
    file: file.file || file,
  };
}


export async function createAttachmentFromFile(file, index) {
  const normalized = normalizePickedFile(file, index);
  const { name, extension, mimeType, size, path, file: rawFile } = normalized;

  if (String(mimeType).startsWith("image/") && !isSupportedImageType(extension, mimeType)) {
    throw new Error("Unsupported image format. Please use JPG, PNG, WEBP, GIF, or BMP.");
  }

  if (isSupportedImageType(extension, mimeType)) {
    const dataUrl = await readFileAsDataUrl({
      path,
      file: rawFile,
      type: mimeType,
      name,
    });

    return {
      id: `${Date.now()}-img-${index}-${Math.random().toString(36).slice(2, 7)}`,
      kind: "image",
      name,
      size,
      mimeType,
      label: buildAttachmentLabel({ kind: "image", size }),
      previewUrl: path || dataUrl,
      dataUrl,
    };
  }

  if (extension === "pdf" || mimeType === "application/pdf") {
    const dataUrl = await readFileAsDataUrl({
      path,
      file: rawFile,
      type: mimeType,
      name,
    });

    return {
      id: `${Date.now()}-pdf-${index}-${Math.random().toString(36).slice(2, 7)}`,
      kind: "pdf",
      name,
      size,
      mimeType,
      label: buildAttachmentLabel({ kind: "pdf", size }),
      dataUrl,
    };
  }

  if (!TEXT_FILE_EXTENSIONS.includes(extension)) {
    throw new Error(`Unsupported file type: .${extension || "unknown"}`);
  }

  const { text } = await readTextAttachment({
    path,
    file: rawFile,
    type: mimeType,
    name,
  });

  return {
    id: `${Date.now()}-txt-${index}-${Math.random().toString(36).slice(2, 7)}`,
    kind: "text",
    name,
    size,
    mimeType,
    label: buildAttachmentLabel({ kind: "text", size }),
    textContent: text,
  };
}

export async function pickAttachments(currentCount = 0) {
  if (typeof uni.chooseFile !== "function") {
    throw new Error("Current platform does not support file picking");
  }

  const remaining = MAX_ATTACHMENTS - currentCount;
  if (remaining <= 0) {
    throw new Error(`You can add up to ${MAX_ATTACHMENTS} attachments`);
  }

  const result = await uni.chooseFile({
    count: remaining,
    extension: PICKABLE_FILE_EXTENSIONS,
    type: "all",
  });

  const sourceFiles = result?.tempFiles || result?.tempFilePaths || [];
  return Promise.all(sourceFiles.map((file, index) => createAttachmentFromFile(file, index)));
}
