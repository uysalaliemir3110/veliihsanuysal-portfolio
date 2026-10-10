// Helpers for removing the underlying image files when projects or gallery
// images are deleted, so nothing is left orphaned on disk (dev) or in Vercel
// Blob (production). All helpers are best-effort: a missing file is not an error.

async function deleteUpload(url: string): Promise<void> {
  try {
    // Production: Vercel Blob stores images at absolute https URLs.
    if (url.startsWith("http://") || url.startsWith("https://")) {
      if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) {
        const { del } = await import("@vercel/blob");
        await del(url);
      }
      return;
    }

    // Development: images live under public/uploads/ as /uploads/<name>.
    if (url.startsWith("/uploads/")) {
      const { unlink } = await import("fs/promises");
      const { join, basename } = await import("path");
      // basename() strips any path segments, neutralizing traversal attempts.
      const filePath = join(process.cwd(), "public", "uploads", basename(url));
      await unlink(filePath);
    }
  } catch (err) {
    // File may already be gone, or removal may have failed — log and move on
    // rather than failing the delete/update the user already committed.
    console.error("deleteUpload failed for", url, err);
  }
}

// Delete the underlying files for a set of image URLs, de-duplicated. Blank or
// repeated URLs (e.g. a cover image that is also a gallery image) are handled.
export async function deleteUploads(
  urls: (string | null | undefined)[]
): Promise<void> {
  const unique = Array.from(
    new Set(urls.filter((u): u is string => typeof u === "string" && u.length > 0))
  );
  await Promise.all(unique.map(deleteUpload));
}
