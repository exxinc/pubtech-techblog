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

/**
 * 画像のマークダウン記法から画像 URL を取り出し、
 * 順番に slug + "-" + index という publicId を付与して画像アップロードを行い、
 * アップロード後の URL に置き換える非同期関数。
 *
 * @param content 変換前の Markdown 文字列
 * @param slug ファイル名用の slug（画像名のベースとなる）
 * @returns 画像のアップロード後の新しい URL に置換済みの Markdown 文字列
 */
export async function replaceImages(content: string, slug: string): Promise<string> {
  // 正規表現: ![notion-image:キャプション](画像URL)
  const imageRegex = /!\[notion-image:(.*?)\]\((.*?)\)/g;
  let imageIndex = 1;
  let newContent = content;

  // matchAll を使って全ての画像マッチを取得
  const matches = Array.from(content.matchAll(imageRegex));
  for (const match of matches) {
    const fullMatch = match[0];  // 例: ![notion-image:キャプション](画像URL)
    // ※ キャプション部分は利用する場合に合わせて取得可能です
    // const caption = match[1];
    const imageUrl = match[2];

    // 画像ごとに連番を付与した publicId を生成
    const publicId = `${slug}-${imageIndex++}`;

    // 画像アップロード関数（アップロード先から新しい URL が返るものとする）
    const newImageUrl = await uploadImage(imageUrl, publicId);

    // 画像マークダウンを、新しい publicId と newImageUrl を使ったものに置換
    const newImageMarkdown = `![${publicId}](${newImageUrl})`;
    newContent = newContent.replace(fullMatch, newImageMarkdown);
  }
  return newContent;
}

export async function uploadImage(filePath: string, publicId?: string): Promise<string> {
  // Configuration
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY, // Click 'View API Keys' above to copy your API key
    api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
  });

  // Upload an image
  const uploadResult = await cloudinary.uploader
  .upload(filePath, { public_id: publicId })
  .catch((error) => {
    console.log(error);
  });

  if (!uploadResult) {
    throw new Error('Failed to upload image');
  }

  // Optimize delivery by resizing and applying auto-format and auto-quality
  const optimizeUrl = cloudinary.url(uploadResult.public_id, {
    fetch_format: 'auto',
    quality: 'auto'
  });

  console.log("optimizeUrl: ", optimizeUrl);
  return optimizeUrl;
}
