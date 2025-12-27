/**
 * SERVICE: Google Drive Integration
 * Handles uploading processed imagery to cloud storage.
 */

export const uploadImageToDrive = async (
  base64Image: string, 
  fileName: string, 
  accessToken: string,
  folderId?: string
) => {
  const metadata: any = {
    name: fileName,
    mimeType: 'image/jpeg',
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  
  // Convert base64 to Blob
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
    console.error("Google Drive API Error:", errorBody);
    throw new Error('Could not upload to Google Drive. Check permissions.');
  }
  
  return await response.json();
};
