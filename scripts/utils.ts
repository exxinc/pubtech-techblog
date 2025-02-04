import { v2 as cloudinary } from 'cloudinary';

/**
 * slugをクリーンにする関数
 *  - 入力文字列を小文字に変換
 *  - 許可されている文字 [a-z0-9\-_] 以外を除去
 *  - 長さが12未満の場合は末尾に'a'を補填（12文字になるまで）
 *  - 長さが50文字を超える場合は50文字に切り詰める
 */
export function cleanSlug(raw: string): string {
  let slug = raw.toLowerCase();
  slug = slug.replace(/[^a-z0-9-_]/g, '');
  if (slug.length < 12) {
    slug = slug.padEnd(12, '_');
  }
  if (slug.length > 50) {
    slug = slug.substring(0, 50);
  }
  return slug;
}

export async function uploadImage(filePath: string): Promise<string> {
  // Configuration
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY, // Click 'View API Keys' above to copy your API key
    api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
  });

  // Upload an image
  const uploadResult = await cloudinary.uploader
  .upload(filePath)
  .catch((error) => {
    console.log(error);
  });

  console.log(uploadResult);
  if (!uploadResult) {
    return '';
  }

  // Optimize delivery by resizing and applying auto-format and auto-quality
  const optimizeUrl = cloudinary.url(uploadResult.public_id, {
    fetch_format: 'auto',
    quality: 'auto'
  });

  console.log(optimizeUrl);
  return optimizeUrl;
}
