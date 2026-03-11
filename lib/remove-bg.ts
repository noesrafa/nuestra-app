const REMOVE_BG_API_KEY = process.env.EXPO_PUBLIC_REMOVE_BG_API_KEY;

export async function removeBackground(imageUri: string): Promise<string> {
  if (!REMOVE_BG_API_KEY) {
    // Si no hay API key, retornar la imagen original
    return imageUri;
  }

  const formData = new FormData();
  formData.append("image_file", {
    uri: imageUri,
    name: "photo.png",
    type: "image/png",
  } as unknown as Blob);
  formData.append("size", "auto");
  formData.append("format", "png");

  const response = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: {
      "X-Api-Key": REMOVE_BG_API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Error al quitar el fondo");
  }

  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}
