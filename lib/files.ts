/** İzin verilen dosya türleri (uzantı => MIME). Word/Excel/zip bilerek yok. */
export const FILE_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  pdf: "application/pdf",
  csv: "text/csv",
  md: "text/markdown",
  markdown: "text/markdown",
  json: "application/json",
  txt: "text/plain",
};

/** Vercel Functions istek gövdesi 4,5 MB ile sınırlı; çok parçalı gövde payı için 4 MB. */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_SVG_BYTES = 2 * 1024 * 1024;

export const extOf = (name: string) => {
  const i = name.lastIndexOf(".");
  return i > -1 ? name.slice(i + 1).toLowerCase() : "";
};
