const isFileInCache = async (
  cacheName: string,
  fileUrl: string
): Promise<boolean> => {
  try {
    // Open the specific cache named 'transformers-cache'
    const cache = await caches.open(cacheName);

    // Check if the file exists in the cache
    const response = await cache.match(fileUrl);

    // Return true if found, false if not
    return response !== undefined;
  } catch (error) {
    console.error("Error checking cache:", error);
    return false;
  }
};

export default isFileInCache;
