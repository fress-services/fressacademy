/** Fait télécharger un fichier créé sur l'appareil ; rien n'est envoyé sur le réseau. */
export function downloadFile(fileName: string, content: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Laisse au navigateur le temps de commencer le téléchargement avant de libérer le fichier.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
