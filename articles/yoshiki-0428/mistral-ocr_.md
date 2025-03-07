---
title: 【朗報】Mistral OCRが本日リリース！驚異のコスパと精度で文書処理が変わる
emoji: 📕
type: tech
topics: [OCR, AI]
published: true
publication_name: "pubtech"
---


こんにちは、[パブテク](https://www.public-technologies.com/)の[yoshiki](https://x.com/yoshiki__0428)です！


# 速報：Mistral AIの新OCRサービスが今日公開


今日、AI企業のMistral社が待望のOCR（光学文字認識）サービスを公開しました！早速試してみたので、その驚きの性能をシェアします。



@[card](https://mistral.ai/news/mistral-ocr)



## Mistral OCRの特徴

- 1000ページで1ドル

**1000ページの処理がわずか1ドル**という破格の価格！他社のOCRサービスと比べると、コストパフォーマンスが桁違いです。大量の文書処理が必要な企業にとって、コスト削減効果は絶大でしょう。

- 高精度な文字認識と画像処理

嬉しいことに、**TypeScriptとPythonのSDK**が既に用意されています。これにより、開発者は簡単にMistral OCRをアプリケーションに統合できます。APIの呼び出しも直感的で、実装の障壁が低いのが特徴です。

- Mistral OCRが出しているベンチマークです。他よりも高いらしい

| Model                | Overall | Math  | Multilingual | Scanned | Tables |
| -------------------- | ------- | ----- | ------------ | ------- | ------ |
| Google Document AI   | 83.42   | 80.29 | 86.42        | 92.77   | 78.16  |
| Azure OCR            | 89.52   | 85.72 | 87.52        | 94.65   | 89.52  |
| Gemini-1.5-Flash-002 | 90.23   | 89.11 | 86.76        | 94.87   | 90.48  |
| Gemini-1.5-Pro-002   | 89.92   | 88.48 | 86.33        | 96.15   | 89.71  |
| Gemini-2.0-Flash-001 | 88.69   | 84.18 | 85.80        | 95.11   | 91.46  |
| GPT-4o-2024-11-20    | 89.77   | 87.55 | 86.00        | 94.58   | 91.70  |
| Mistral OCR 2503     | 94.89   | 94.29 | 89.55        | 98.96   | 96.12  |


## 実際に使ってみよう


以下は基本的なcURLコマンドの例です：


```shell
curl -X POST "<https://api.mistral.ai/v1/ocr>" \\
     -H "Authorization: Bearer YOUR_API_KEY" \\
     -H "Content-Type: application/json" \\
     -d '{
           "model": "mistral-ocr-latest",
           "id": "unique_request_id",
           "document": {
             "type": "document_url",
             "document_url": "https://example.com/name.pdf",
             "document_name": "transport_statistics"
           },
           "pages": [0],
           "include_image_base64": false,
           "image_limit": 5,
           "image_min_size": 100
         }'
```


Python, TypeScriptの場合はこちら


```python
import os
from mistralai import Mistral

api_key = os.environ["MISTRAL_API_KEY"]
client = Mistral(api_key=api_key)

ocr_response = client.ocr.process(
    model="mistral-ocr-latest",
    document={
        "type": "document_url",
        "document_url": "https://arxiv.org/pdf/2201.04234"
    },
    include_image_base64=True
)
```


```typescript
import { Mistral } from '@mistralai/mistralai';

const apiKey = process.env.MISTRAL_API_KEY;
const client = new Mistral({apiKey: apiKey});

const ocrResponse = await client.ocr.process({
    model: "mistral-ocr-latest",
    document: {
        type: "document_url",
        documentUrl: "https://arxiv.org/pdf/2201.04234"
    },
    include_image_base64: true
});
```



@[card](https://docs.mistral.ai/capabilities/document/#ocr-with-pdf)



試しに国土交通省が公開しているPDFファイルをOCRしてみます

:::details 取得結果


```json
{"pages":[{"index":0,"markdown":"# 第1章 \n\n## 人口減少と国土交通行政\n\n第1章「人口減少と国土交通行政」においては、まず、第2章以下の議論の前提として、我が国で進展する少子高齢化・人口減少をめぐる厳しい状況を認識し、労働力（生産年齢人口）の減少が経済等に及ぼす影響について取り上げる。次に、国内の出生率等の低下といった少子化の進行における課題等について、そして、高齢社会と地域活力の維持における課題等について概観する。\n\n## 第1節「本格化する少子高齢化・人口減少における課題\n\n少子高齢化・人口減少は、我が国の未来を左右する。我が国の人口は、2008年の 1 億 2,808 万人 をピークに、2011年以降13年連続で減少しており、2023年10月時点の総人口は 1 億 2,435 万人 と、前年に比べて約 60 万人減少している ${ }^{(21)}$ 。\n\n国立社会保障・人口問題研究所の将来推計人口では、2070年には、我が国の人口が 9,000 万人を割り込むと推計されている。また、高齢化も進行し、65歳以上の人口割合を示す高齢化率は、2020年の $28.6 \\%$ から、2070年には $38.7 \\%$ へ上昇すると推計されている。\n![img-0.jpeg](img-0.jpeg)\n\n[^0]\n[^0]:    注1 総務省「人口推計（2023 年（令和5年）10月1日現在）」より。","images":[{"id":"img-0.jpeg","top_left_x":160,"top_left_y":1141,"bottom_right_x":1498,"bottom_right_y":2006,"image_base64":null}],"dimensions":{"dpi":200,"height":2339,"width":1654}}],"model":"mistral-ocr-2503-completion","usage_info":{"pages_processed":1,"doc_size_bytes":4522856}}
```



:::


画像なしのJSONはこんな感じでした。結構精度が高い。


画像アリの場合は、base64でレスポンスがされるようです。


## 活用シーン


このサービスは以下のようなシーンで特に威力を発揮しそうです：

1. **大量の紙文書のデジタル化** - 低コストで高速処理
2. **請求書や契約書の自動処理** - 正確な情報抽出
3. **古文書や資料のアーカイブ** - 画像も含めた完全保存
4. **多言語文書の翻訳前処理** - 高精度なテキスト抽出

## まとめ


Mistral OCRの登場は、文書処理の世界に大きな変革をもたらす可能性があります。特に、そのコストパフォーマンスの高さは、これまでコスト面で二の足を踏んでいた企業にとって朗報です。TypeScriptやPythonのSDKも用意されており、開発者にとっても導入のハードルが低いのが魅力です。


今後のアップデートや機能拡張にも期待大です！皆さんもぜひ試してみてください。


---


_この記事は2025年3月7日の情報に基づいています。最新情報は_[_Mistral AI公式サイト_](https://mistral.ai/)_でご確認ください。_

