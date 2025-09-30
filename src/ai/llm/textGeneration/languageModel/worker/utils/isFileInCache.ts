const isFileInCache = async (
  cacheName: string,
  fileUrl: string,
): Promise<boolean> => {
  try {
    const cache = await caches.open(cacheName);
    const response = await cache.match(fileUrl);
    return response !== undefined;
  } catch (error) {
    console.error("Error checking cache:", error);
    return false;
  }
};

export default isFileInCache;
