---
title: tRPC x Feature Flag で実現するスムーズなトランクベース開発
emoji: ⛳
type: tech
topics: [FeatureFlag, tRPC, Node]
published: true
publication_name: "pubtech"
---


# **はじめに**


こんにちは！パブテクでテックリードをしている[yoshiki](https://x.com/yoshiki__0428)です。


今回は弊社新規プロダクトでFeatureFlagを導入することになったのでtRPCと組み合わせて安全にトランクベース開発を運用していく方法を記載しました。


FeatureFlagを導入することで「顧客に迷惑をかけることなく安全に新機能をリリースできる」「mainへのマージでコンフリクトを少なくしたい」今回紹介する**tRPC**の**middleware**を利用することで「フラグの分岐修正ミス」などの課題を解決できるかと思います。


# 本題


今回は、**tRPC** と **Feature Flag** を組み合わせて、トランクベース開発をスムーズに進める方法についてご紹介します。


トランクベース開発では、全開発者が単一のブランチ（通常は main ブランチ）で作業を行い、頻繁に統合することでコードの衝突を減らし、開発のスピードを向上させます。しかし、未完成の機能をどうやってユーザーから隠しながら本番環境にデプロイするか？という課題が存在します。


この記事では、tRPC のミドルウェア機能を使って、API レベルでの Feature Flag 制御を実装する方法を解説します。


## **Feature Flag とは？**


Feature Flag（機能フラグ）は、アプリケーションのコード内に条件分岐を設け、特定の機能のオン・オフを動的に切り替える手法です。これにより以下のようなメリットが得られます：

- 未完成の機能を本番環境にデプロイしたままで、利用できないように制御できる
- 特定のユーザーやテナントに対してのみ新機能を公開できる（A/Bテストなど）
- 問題が発生した場合に、コードをロールバックせずに機能を無効化できる

トランクベース開発において、Feature Flag は「完成していないコードを main ブランチに入れる」という課題を解決するための重要なツールとなります。


## **Feature Flag サービスの比較**


Feature Flag を実装するには、自前で構築する方法と、既存のサービスを利用する方法があります。以下に主なサービスの比較を示します：


### 比較表


| サービス                                                                                                                       | 無料プラン (制限)                                                                | 最安有料プラン (価格)                                                                | 商用利用                              | オープンソース版 (セルフホスト)                    | OpenFeature対応ライブラリ                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| [**LaunchDarkly**](https://launchdarkly.com/)                                                                              | あり（Developerプラン: _無料_「Free forever」。1プロジェクト、3環境、5接続/月、クライアント側MAU 1,000/月） | Foundationプラン: _従量課金_で$12/サービス接続または$12/1,000 MAUごと（Unlimited席、プロジェクト・環境無制限） | 可能（無料枠を含め商用利用可）                   | 無し（クローズドソースのSaaS）                    | [LaunchDarkly OpenFeature Provider](https://launchdarkly.com/docs/sdk/openfeature)                  |
| [**Flagsmith**](https://www.flagsmith.com/)                                                                                | あり（_Freeプラン_: 50,000リクエスト/月、1チームメンバー、フラグ・環境・ユーザーセグメント無制限）                 | Start-Upプラン: $45/月（~1,000,000リクエスト/月、3ユーザーまで）                               | 可能（無料プラン含め商用利用可）                  | あり（OSS版を提供。BSD-3-Clauseライセンス）        | [Flagsmith OpenFeature Provider](https://www.flagsmith.com/openfeature)                             |
| [**Unleash**](https://github.com/Unleash/unleash)                                                                          | あり（OSS版を無料セルフホスト可能。クラウド版の無料プランなし）                                         | Proプラン: $80/月（5ユーザーまで含む。2環境・3プロジェクトまで、追加ユーザーは1人$15/月）                       | 可能（OSS版はApache License 2.0で商用利用可） | あり（Apache2.0ライセンスのOSS版を提供）           | [Unleash OpenFeature Provider](https://github.com/Unleash/unleash/issues/3912)                      |
| **Split (Harness)**                                                                                                        | あり（Developerプラン: 10ユーザーまで無料、月間ユニークユーザ指標MTK_50,000_まで）                     | Teamプラン: $33/ユーザー/月（10～25ユーザー向け。月間~50,000ユニークユーザまでを含む）                      | 可能（無料Developer版を商用利用可）            | 無し                                   | [Split.io OpenFeature Provider](https://github.com/splitio/split-openfeature-provider-dotnet)       |
| [**CloudBees**](https://cloudbees.io/)                                                                                     | あり（Communityエディション: 最大5ユーザー、100,000 MAUまで無料）                              | Teamプラン: 16～25ユーザー・最大100万MAUまで対応。例: ~20ユーザー・50万MAUで$1,325/月                 | 可能（無料版も機能フルセットで提供）                | 無し                                   | [CloudBees OpenFeature Provider](https://www.npmjs.com/package/cloudbees-openfeature-provider-node) |
| [**Optimizely Rollouts**](https://docs.developers.optimizely.com/full-stack-experimentation/docs/introduction-to-rollouts) | あり（Rolloutsプラン: 無料で無制限のフラグとコラボレータ利用可能。※同時実行実験は1件まで）                       | Full Stackプラン: エンタープライズ向け有料版（座席数やMAU増加・高度な機能には有料Full Stackへのアップグレードが必要）     | 可能（全ユーザー・企業に無料提供）                 | 無し                                   | [Optimizely OpenFeature Provider](https://feedback.optimizely.com/ideas/FSS-I-346)                  |
| [**ConfigCat**](https://configcat.com/)                                                                                    | あり（Freeプラン: 2環境・10フラグまで）                                                  | Proプラン: $99/月〜（フラグ・環境数の上限増）                                                 | 可能（無料でも機能制限なく商用利用可）               | 無し（※Enterprise契約でソースコード共有のエスクロー提供あり） | [ConfigCat OpenFeature Provider](https://configcat.com/docs/sdk-reference/openfeature/overview/)    |
| [**DevCycle**](https://www.devcycle.com/)                                                                                  | あり（Free Forever: 無制限Seats、1,000 MAU/月まで無料）                                | Developerプラン: $10/月 ※年払（1,000 MAU含む）                                        | 可能（無料版を継続利用可能）                    | 無し（OpenFeature標準採用の独自クラウドサービス）       | [DevCycle OpenFeature Provider](https://docs.devcycle.com/sdk/server-side-sdks/go/go-openfeature/)  |


これらの比較から、最終的に我々は **CloudBees** を採用することにしました。主な採用理由は：

- 10万MAUまで無料で使える
- OpenFeature Provider がサポートされている
- バックエンドでの利用が主なユースケースだった

## **OpenFeature とは？**


[**OpenFeature**](https://openfeature.dev/) は、Feature Flag のオープンスタンダードを目指すプロジェクトです。異なるベンダーの Feature Flag サービスを統一的な API で扱えるようにすることで、ベンダーロックインを防ぎ、将来的な乗り換えをスムーズにします。


CloudBeesをはじめ、多くの Feature Flag サービスが OpenFeature に対応したプロバイダーを提供しています。


## **tRPC ミドルウェアによる Feature Flag の実装**


では、実際に tRPC と Feature Flag を組み合わせた実装を見ていきましょう。


### **1. 必要なパッケージのインストール**


```bash
npm install @openfeature/server-sdk cloudbees-openfeature-provider-node
```


### **2. OpenFeature ゲートウェイの実装**


まず、OpenFeature の API を使って Feature Flag を評価するゲートウェイクラスを作成します：


```typescript
// OpenFeatureGateway.ts
import {
  type Client,
  type EvaluationContext,
  type JsonValue,
  OpenFeature,
} from "@openfeature/js-sdk";
import { CloudbeesProvider } from "cloudbees-openfeature-provider-node";
import { injectable, singleton } from "tsyringe";
import type { IOpenFeatureGateway } from "./types";

@injectable()
@singleton()
export class OpenFeatureGateway implements IOpenFeatureGateway {
  private defaultClient: Client | null = null;
  private initialized = false;

  /**
   * ゲートウェイを初期化し、OpenFeatureにプロバイダーを設定
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // OpenFeatureにプロバイダーを設定して初期化完了を待つ
      await OpenFeature.setProviderAndWait(
        await CloudbeesProvider.build(process.env.FEATURE_FLAG_API_KEY || ""),
      );
      this.defaultClient = OpenFeature.getClient();
      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize OpenFeature Gateway:", error);
      throw error;
    }
  }

  public async close(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    await OpenFeature.close();
    this.defaultClient = null;
    this.initialized = false;
  }

  /**
   * ブールフラグの値を評価
   * @param flagKey フラグのキー
   * @param defaultValue デフォルト値
   * @param context 評価コンテキスト
   */
  public async getBooleanValue(
    flagKey: string,
    defaultValue: boolean,
    context?: Record<string, any>,
  ): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.defaultClient) throw new Error("Default client not found.");

    return this.defaultClient.getBooleanValue(
      flagKey,
      defaultValue,
      context as EvaluationContext,
    );
  }

  // その他のメソッド（getStringValue, getNumberValueなど）は省略
}

```


### **3. Feature Flag サービスの実装**


次に、アプリケーション内で使用するサービスクラスを作成します：


```typescript
// FeatureFlagService.ts
import { inject, injectable } from "tsyringe";
import type { IOpenFeatureGateway } from "../../infrastructure/externalapi/openfeature/types";

@injectable()
export class FeatureFlagService {
  constructor(
    @inject("IOpenFeatureGateway")
    private openFeatureGateway: IOpenFeatureGateway,
  ) {}

  async getBooleanValue(flagKey: string, userId: string, tenantId: string) {
    return this.openFeatureGateway.getBooleanValue(flagKey, false, {
      user_id: userId,
      tenant_id: tenantId,
    });
  }
}

```


### **4. tRPC ミドルウェアの実装**


Feature Flag を評価するミドルウェアを実装します。これが今回の記事の肝です


```typescript
// featureFlag.ts
import { TRPCError } from "@trpc/server";
import { FeatureFlagService } from "../application/service/FeatureFlagService";
import { container } from "../container";
import { t } from "../trpc";
import { isAuthenticated } from "./auth";

const featureFlagService = container.resolve(FeatureFlagService);

/**
 * 認証済みかつ特定のフィーチャーフラグが有効な場合のみ処理を許可するprocedure
 * @param flagKey フィーチャーフラグのキー
 * @returns 認証とフィーチャーフラグをチェックするprocedure
 */
export const featureFlagProcedure = (flagKey: string) => {
  return t.procedure.use(isAuthenticated).use(async ({ ctx, next }) => {
    // テナントからフィーチャーフラグの状態を確認
    const tenant = ctx.tenant;

    if (!tenant) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Tenant information is required for feature flag check",
      });
    }

    // フィーチャーフラグの状態を確認
    const isEnabled = await featureFlagService.getBooleanValue(
      flagKey,
      ctx.userId,
      tenant.tenantId,
    );

    if (!isEnabled) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Feature '${flagKey}' is not enabled for this tenant`,
      });
    }

    // フィーチャーが有効な場合は次の処理に進む
    return next({
      ctx: {
        ...ctx,
      },
    });
  });
};

```


このミドルウェアは、特定の機能フラグが有効になっている場合のみ、API エンドポイントへのアクセスを許可します。ポイントは：

1. 認証済みユーザーのみがアクセスできる(**`isAuthenticated`**ミドルウェアを使用)
2. テナント情報を取得して、そのテナントに対して機能が有効かどうかを確認
3. 機能が無効な場合は **`FORBIDDEN`** エラーを返し、有効な場合は次の処理に進む

あとは、フラグをcloudbeesの管理画面で作成してテナントやユーザIDで条件を作成して確認をしてみましょう。


![trpc-feature-flag-trunkbase-1](https://res.cloudinary.com/dlg4qjsyv/image/upload/f_auto,q_auto/trpc-feature-flag-trunkbase-1?_a=BAMCkGJu0)


### **5. ルーターでの使用例**


作成した**`featureFlagProcedure`**を使って、特定の API エンドポイントに Feature Flag を適用します：


```typescript
// TestRouter.ts
import { router } from "../../middleware";
import { featureFlagProcedure } from "../../middleware/featureFlag";

export const testRouter = router({
  // この API は "new_feature" が有効な場合のみアクセス可能
  testFeatureFlag: featureFlagProcedure("new_feature").query((ctx) => {
    return "new_feature is enabled";
  }),

  // 他のエンドポイント...
});

```


### **6. サーバー起動時の初期化**


最後に、サーバー起動時に Feature Flag サービスを初期化します：


```typescript
// server.ts
const start = async () => {
  try {
    // Initialize feature flags
    const featureFlagGateway = container.resolve<IOpenFeatureGateway>(
      "IOpenFeatureGateway",
    );
    await featureFlagGateway.initialize();

    await server.listen({ port: Number(port), host: "0.0.0.0" });
    console.log("listening on port", port);

    // Cleanup on shutdown
    const cleanup = async () => {
      await featureFlagGateway.close();
      await stop();
    };

    process.on("SIGTERM", cleanup);
    process.on("SIGINT", cleanup);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

```


## **この実装のメリット**


この tRPC ミドルウェアによる Feature Flag 実装には、以下のメリットがあります：

1. **API レベルの一元管理**: 機能のオン・オフを API レベルで制御できるため、フロントエンドでの条件分岐が不要になります。
2. **型安全性**: tRPC の型安全性を活かして、Feature Flag の状態に基づいた API の可用性をコンパイル時に確認できます。
3. **メンテナンス性**: 新機能の追加時に **`featureFlagProcedure("new_feature")`** と書くだけで簡単に Feature Flag が適用できます。
4. featureFlagを消すときは **`authProcedure`** に戻すだけなのでif分岐に悩む必要がありません。
5. **スケーラビリティ**: OpenFeature を採用しているため、将来的に別の Feature Flag サービスに乗り換えることも容易です。

## **まとめ：トランクベース開発と Feature Flag**


トランクベース開発と Feature Flag を組み合わせることで、以下のようなメリットが得られます：

- 長期間のブランチ開発による統合の痛みを避けることができる
- 本番環境に未完成のコードをデプロイしつつ、ユーザーには見せない制御が可能
- 段階的なロールアウトやA/Bテストなど、より高度なデプロイ戦略が取れる

特に、tRPC のミドルウェア機能を活用することで、型安全かつ一元管理された Feature Flag の実装が可能になります。これにより、開発者はコードの品質を維持しながら、より速いペースで機能を提供できるようになります。


前の職場では自前のDBでfeatureFlagを管理していましたが、マイクロサービス時代ではFeatureFlag SaaSを取り扱うことが当たり前になっていきそうですね。上手く規模に応じてSaaSを乗り換えることもできるのでOpenFeatureを選定して良かったと思っています。


私たちのプロジェクトでは CloudBees と OpenFeature を採用しましたが、OpenFeature の標準化により、将来的な要件変更にも柔軟に対応できる体制が整いました。トランクベース開発を実践する上で、Feature Flag は非常に強力なツールとなっています。


ぜひ皆さんのプロジェクトでも、tRPC と Feature Flag を組み合わせた開発手法を試してみてください！


## **参考リンク**

- [**OpenFeature**](https://openfeature.dev/)
- [**tRPC**](https://trpc.io/)
- [**CloudBees Feature Management**](https://www.cloudbees.com/products/feature-management)
- [**Trunk Based Development**](https://trunkbaseddevelopment.com/)
