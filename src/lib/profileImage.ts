const PROFILE_IMAGE_SIZE = 512;
const MAX_SOURCE_SIZE = 12 * 1024 * 1024;

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지 파일을 읽지 못했어요."));
    };
    image.src = url;
  });
}

export async function prepareProfileImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("이미지 파일만 선택할 수 있어요.");
  if (file.size > MAX_SOURCE_SIZE) throw new Error("원본 이미지는 12MB 이하여야 해요.");

  const image = await loadImage(file);
  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  if (!sourceSize) throw new Error("이미지 크기를 확인하지 못했어요.");
  const sourceX = (image.naturalWidth - sourceSize) / 2;
  const sourceY = (image.naturalHeight - sourceSize) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = PROFILE_IMAGE_SIZE;
  canvas.height = PROFILE_IMAGE_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("이미지를 변환하지 못했어요.");
  context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, PROFILE_IMAGE_SIZE, PROFILE_IMAGE_SIZE);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  if (!blob) throw new Error("WebP 이미지로 변환하지 못했어요.");
  return blob;
}
