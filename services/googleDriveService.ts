/**
 * SERVICE: Google Drive Integration
 */

// --- IMPLEMENTACIÓN REAL ---

/**
 * Sube una imagen Base64 a Google Drive usando la API REST.
 * 
 * @param base64Image La imagen en formato base64.
 * @param fileName El nombre del archivo.
 * @param accessToken El token de acceso de Google OAuth.
 * @param folderId (Opcional) El ID de la carpeta donde se subirá.
 */
export const uploadImageToDriveReal = async (
  base64Image: string, 
  fileName: string, 
  accessToken: string,
  folderId?: string
) => {
  const metadata: any = {
    name: fileName,
    mimeType: 'image/jpeg',
  };

  // Si se proporciona un Folder ID, lo añadimos a los padres
  if (folderId) {
    metadata.parents = [folderId];
  }

  // Prepara el cuerpo Multipart
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  
  // Convierte base64 a Blob de manera eficiente
  const byteCharacters = atob(base64Image.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const fileBlob = new Blob([byteArray], { type: 'image/jpeg' });
  
  form.append('file', fileBlob);

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,name', {
    method: 'POST',
    headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
    body: form,
  });

  if (!response.ok) {
    const errorBody = await response.json();
    console.error("Drive API Error:", errorBody);
    throw new Error('Error subiendo a Drive. Verifica permisos.');
  }
  
  return await response.json(); // Retorna { id, webViewLink, name }
};

// Mantiene la versión Mock por si falla la auth o para pruebas rápidas
export const uploadImageToDriveMock = async (image: string): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("https://drive.google.com/drive/u/0/folders/1wOr93Yy-L1z1FgR5OBy_w_wUxTABNMVK");
    }, 2000);
  });
};