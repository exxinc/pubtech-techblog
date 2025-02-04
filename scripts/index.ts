import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import {Client} from "@notionhq/client";
import {n2m} from "./transformer.ts";
import {cleanSlug} from "./utils.ts";

const notionToken = process.env.PERSONAL_NOTION_TOKEN;
if (!notionToken) {
  console.error('Error: PERSONAL_NOTION_TOKEN is not defined.');
  process.exit(1);
}
const notion = new Client({ auth: process.env.PERSONAL_NOTION_TOKEN });

// 環境変数から Notion データベース ID を取得
const databaseId = process.env.PERSONAL_NOTION_DATABASE_ID;
if (!databaseId) {
  console.error('Error: PERSONAL_NOTION_DATABASE_ID is not defined.');
  process.exit(1);
}

(async () => {
  try {
    // 例：Status プロパティが "公開" かつ、ZennTypeが設定されている記事を取得
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        and: [
          {
            property: 'Status',
            status: { equals: '公開' }
          },
          {
            property: 'User Name',
            select: { is_not_empty: true }
          },
          {
            property: 'ZennType',
            select: { is_not_empty: true }
          },
          {
            property: 'Tags',
            multi_select: { is_not_empty: true }
          },
          {
            property: 'Slug',
            rich_text: { is_not_empty: true }
          }
        ]
      },
    });
    const pages = response.results as any[];

    console.log('published articles:', pages.length);

    // Notionから生成されたslugの一覧を保持する配列
    const generatedSlugs = new Set<string>();

    for (const page of pages) {
      const pageId: string = page.id;

      // タイトル取得
      const title: string = page.properties["名前"].title[0].plain_text;

      // User Name を取得
      const userName: string = page.properties["User Name"].select.name;

      // ファイル名用の Raw Slug（なければ pageId をベースにする）
      const slugProp = page.properties.Slug;
      const rawSlug: string =
          (slugProp && slugProp.rich_text?.[0]?.plain_text.replace(/\s+/g, '-')) ||
          pageId.replace(/-/g, '');
      // ルールに則ってslugをクリーンにする
      const slug = cleanSlug(rawSlug);
      generatedSlugs.add(slug);

      // notion-to-md でページ内容を Markdown に変換
      const mdBlocks = await n2m.pageToMarkdown(pageId);
      const mdString = n2m.toMarkdownString(mdBlocks);

      // zenn type の取得
      const zennType = page.properties.ZennType.select.name;

      // Zenn 用 Front Matter の生成
      const frontMatter = `---
title: ${title}
emoji: ${page.icon?.emoji ?? '📝'}
type: ${zennType}
topics: [${page.properties.Tags.multi_select.map((tag: any) => tag.name).join(', ')}]
published: true
publication_name: "pubtech"
---

`;
      if (!mdString.parent) {
        console.error(`Error: ${title} has no content.`);
        continue;
      }
      // zenn用のmarkdownに変換
      const content = frontMatter + mdString.parent
        // callout 💡の場合、メッセージ
        .replace(/> 💡 (.+)/g, (match, p1) => {
          return `:::message\n${p1}\n:::`; })
        // callout ⚠️の場合、警告メッセージ
        .replace(/> ⚠️ (.+)/g, (match, p1) => {
          return `:::message alert\n${p1}\n:::`; })
        // toggle の場合、details に変換
        .replace(/<details>\n<summary>(.*?)<\/summary>(.*?)<\/details>/gs, (match, summary, content) => {
        return `:::details ${summary}
${content}
:::`;
      });

      // ※ mdString.parent を使用しているのは、notion-to-md の出力構造に合わせています。
      // const content = frontMatter + mdString.parent;

      // User Name ごとのディレクトリ作成
      const userDir = path.join('articles', userName);
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }

      // ファイルの出力
      const filePath = path.join(userDir, `${slug}.md`);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`File created: ${filePath}`);
    }

    // 既存のarticlesディレクトリ内の.mdファイルを走査し、
    // 生成されたslugに含まれていないファイルを削除する
    const files = fs.readdirSync('articles');
    for (const file of files) {
      const userDirPath = path.join('articles', file);
      const stats = fs.statSync(userDirPath);
      if (stats.isDirectory()) {
        const userFiles = fs.readdirSync(userDirPath);
        for (const userFile of userFiles) {
          const baseName = path.basename(userFile, '.md');
          if (!generatedSlugs.has(baseName)) {
            const filePath = path.join(userDirPath, userFile);
            fs.unlinkSync(filePath);
            console.log(`Deleted obsolete file: ${filePath}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error occurred:', error);
    process.exit(1);
  }
})();
