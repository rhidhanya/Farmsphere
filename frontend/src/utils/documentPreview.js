import { documentAPI } from '../api/client';

/**
 * Determine best MIME type from document metadata or headers
 */
const resolveMimeType = (document, responseHeaders = {}) => {
  const headerType = responseHeaders['content-type'];
  if (headerType && headerType !== 'application/octet-stream' && headerType !== 'text/html') {
    return headerType;
  }

  if (document?.fileType) {
    return document.fileType;
  }

  const name = (document?.documentName || '').toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';

  return 'application/pdf'; // Default fallback for verification docs
};

/**
 * Open document in new tab/window for preview, with fallback download if blocked
 */
export const openDocumentPreview = async (document) => {
  if (!document?._id) {
    throw new Error('Document ID is required to preview a file.');
  }

  const response = await documentAPI.getDocumentFile(document._id);
  const mimeType = resolveMimeType(document, response.headers || {});
  const typedBlob = new Blob([response.data], { type: mimeType });
  const blobUrl = URL.createObjectURL(typedBlob);

  const previewWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');

  if (!previewWindow) {
    // If popup was blocked by browser, trigger download fallback
    const downloadLink = window.document.createElement('a');
    downloadLink.href = blobUrl;
    downloadLink.download = document.documentName || `document_${document._id}.pdf`;
    window.document.body.appendChild(downloadLink);
    downloadLink.click();
    window.document.body.removeChild(downloadLink);
  }

  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
};

/**
 * Explicit download action for a document
 */
export const downloadDocumentFile = async (document) => {
  if (!document?._id) {
    throw new Error('Document ID is required to download a file.');
  }

  const response = await documentAPI.getDocumentFile(document._id);
  const mimeType = resolveMimeType(document, response.headers || {});
  const typedBlob = new Blob([response.data], { type: mimeType });
  const blobUrl = URL.createObjectURL(typedBlob);

  const downloadLink = window.document.createElement('a');
  downloadLink.href = blobUrl;
  downloadLink.download = document.documentName || `document_${document._id}.pdf`;
  window.document.body.appendChild(downloadLink);
  downloadLink.click();
  window.document.body.removeChild(downloadLink);

  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
};
