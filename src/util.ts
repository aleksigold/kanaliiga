export const createUrl = (url: string) => {
  return `${import.meta.env.VITE_PROXY_URL ?? '/proxy'}?url=${url}`;
};
