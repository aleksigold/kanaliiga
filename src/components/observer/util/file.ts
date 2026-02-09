export const download = (name: string, blob: Blob) => {
  const anchor = document.createElement('a');
  anchor.download = name;
  anchor.href = URL.createObjectURL(blob);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};
