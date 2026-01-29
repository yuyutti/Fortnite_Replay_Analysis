## 🌐 Language

- [English](./README.md)
- [日本語](./README.ja.md)

# Fortnite Replay Analysis

Fortnite の .replay ファイルを解析し、  
プレイヤー情報・チーム順位・生存時間・スコア計算まで一括で処理できる  
Node.js ライブラリです。

---

## 特徴

✅ Fortnite .replay ファイルを直接解析  
✅ Windows / Linux 対応（自己完結バイナリ）  
✅ KillFeed から 正確なチーム順位を復元  
※チーム順位は、KillFeed に記録された撃破順を解析することで復元されます。  
✅ Bot 除外・順位ソート対応  
✅ チーム / 個人キル両対応のスコア計算  
✅ 複数マッチのスコアを自動マージ  
✅ 平均キル数・平均順位・総生存時間の算出  
✅ Decimal.js による高精度計算  
※ Decimal.js は内部で使用しており、利用者側での追加インストールは不要です。  

---

## 動作環境

- Node.js 18 以上推奨  
- Windows x64 / Linux x64  

※ テスト環境 Node.js v22.22.0  
※ macOS は現在未対応です

---

## インストール

```bash
npm install fortnite-replay-analysis@latest
```

---

## 使い方

#### リプレイ解析（最新の .replay を自動選択）

```js
const { ReplayAnalysis } = require("fortnite-replay-analysis");

(async () => {
    const {
        rawReplayData,
        rawPlayerData,
        processedPlayerInfo,
        processedPlacementInfo
    } = await ReplayAnalysis("./replay", {
        bot: false,
        sort: true
    });

    console.log(processedPlayerInfo);
})();
```

##### 単一ファイルを指定する場合

```js
await ReplayAnalysis("./replay/match1.replay");
```

---

### スコア計算（単一マッチ）

ReplayAnalysis の結果をそのまま使って  
順位ポイント＋キルポイントを計算します。

```js
const { calculateScore } = require("fortnite-replay-analysis");

const scores = await calculateScore({
    matchData: processedPlayerInfo.hybrid,
    points: {
        1: 11,
        2: 6,
        3: 3
    },
    killMode: "team",
    killCountUpperLimit: null,
    killPointMultiplier: 1
});

console.log(scores);
```

※ calculateScore 内部で sortScores が自動実行されるため、  
戻り値はすでに公式準拠ルールでソートされています。

---

### スコアの再ソートのみを行う場合

既存のスコア配列を、  
公式ルール準拠で再ソートしたい場合に使用します。

```js
const { sortScores } = require("fortnite-replay-analysis");

const sortedScores = sortScores([...scores]);
```

※ sortScores は配列を直接書き換えるため、  
スプレッド構文でコピーしてから渡すことを推奨します。

---

### 複数マッチのスコアをマージする場合

複数マッチ分のスコア配列を、  
同一メンバー構成のパーティ単位で統合します。

```js
const { mergeScores } = require("fortnite-replay-analysis");

const mergedScores = mergeScores([
    scoresMatch1,
    scoresMatch2,
    scoresMatch3
]);

console.log(mergedScores);
```

---

## API

### ReplayAnalysis(inputPath, options)

Fortnite の .replay ファイルを解析し、  
生データ・整形済みプレイヤー情報・  
KillFeed から復元したチーム順位情報を返します。

#### 引数

- inputPath (string)  
  .replay ファイル、または .replay ファイルを含むディレクトリのパス  
  ディレクトリを指定した場合は、  
  更新日時が最も新しい .replay ファイルが自動で選択されます。

- options (object, 省略可)

  - bot (boolean)  
    Bot プレイヤーを含めるか  
    デフォルト: false  
    false の場合、processedPlayerInfo から Bot が除外されます。

  - sort (boolean)  
    processedPlayerInfo を Placement 昇順でソートするか  
    デフォルト: true

#### 戻り値

Promise<ReplayAnalysisResult>

```ts
type ReplayAnalysisResult = {
    rawReplayData: any;                      // 解析結果全体の生データ
    rawPlayerData: any[];                    // parsed.PlayerData
    processedPlayerInfo: {                   // 整形済みプレイヤー情報
        raw: PlayerInfo[];
        generated: PlayerInfo[];
        hybrid: PlayerInfo[];
    };
    processedPlacementInfo: {
        raw: {
            teams: TeamFromKillFeed[];
            placement: Record<number, string[]>;
        };
        generated: {
            teams: TeamFromKillFeed[];
            placement: Record<number, string[]>;
        };
        hybrid: {
            teams: TeamFromKillFeed[];
            placement: Record<number, string[]>;
        };
    };
};
```

- raw: リプレイファイルに含まれる順位情報をそのまま使用したデータ  
- generated: KillFeed の撃破順のみを元に復元した順位データ  
- hybrid: リプレイの順位情報を優先し、存在しない場合は KillFeed 復元結果を使用  

---

### calculateScore(config)

ReplayAnalysis の processedPlayerInfo を元に、  
チーム単位または個人単位でスコアを集計します。

#### 引数

- config (object)

  - matchData (PlayerInfo[] | string, 必須)  
    ReplayAnalysis の processedPlayerInfo 配列、  
    またはその配列を保存した JSON ファイルへのパス  
    ※ JSON は配列そのものの形式である必要があります。

  - points (Record<number, number>, 必須)  
    順位ごとのポイント設定  

    ```js
    {
        1: 11,
        2: 6,
        3: 3
    }
    ```

    ※ 指定されていない順位は 0 扱いになります。

  - killMode ("team" | "individual", 省略可)  
    デフォルト: team  

    team  
    → チームメンバー全員のキル数を合算  

    individual  
    → プレイヤー単位でキル数を集計（partyNumber は保持）

  - killCountUpperLimit (number | null, 省略可)  
    キル数の上限  
    デフォルト: null（無制限）

  - killPointMultiplier (number, 省略可)  
    1 撃破あたりのポイント倍率  
    デフォルト: 1

#### 戻り値

Promise<PartyScore[]>

```ts
type PartyScore = {
    playerId: number | null;          // individual 指定時のみ使用
    partyNumber: number;
    partyPlacement: number | null;    // 単一マッチ時の順位
    partyKills: number;               // 上限適用後
    partyKillsNoLimit: number;        // 上限なし
    partyKillPoints: number;
    partyPoint: number;
    partyScore: number;
    partyVictoryRoyale: boolean;
    partyMemberList: string[];
    partyMemberIdList: string[];
    partyAliveTimeList: Decimal[];
    matchName: string | null;
};
```

#### 補足

- 内部で sortScores が自動実行されるため、  
  戻り値は常に公式準拠ルールでソート済みです。

- individual 指定時でも partyNumber は保持されますが、  
  集計キーは playerId になります。

- partyKillsNoLimit は上限適用前、  
  partyKills は killCountUpperLimit 適用後の値です。

---

### sortScores(scoreArray)

スコア配列を公式ルール準拠でソートします。

#### ソート順（優先度）

1. 累計獲得ポイント  
2. Victory Royale 回数  
3. 平均撃破数  
4. 平均順位（小さい方が上位）  
5. 合計生存時間  
6. 最初のマッチのパーティ番号（最終タイブレーク）

#### 破壊的変更について

```js
sortScores(scores);
```

この呼び出しでは  
scores 配列そのものの並び順が書き換えられます。

安全な使い方：

```js
sortScores([...scores]);
```

※ sortScores は Array.prototype.sort を使用するため、破壊的です。

---

### mergeScores(scoreArrays)

パーティの一致判定は、メンバーの Epic Account ID を基準に行われ、順序は考慮されません。

複数マッチ分のスコア配列を、  
同一メンバー構成のパーティ単位でマージします。

#### 戻り値

各パーティに overallSummary が追加されます。

```js
type OverallSummary = {
    totalPoint: number;        // 合計スコア
    victoryCount: number;      // Victory Royale 回数
    matchCount: number;        // 試合数
    avgKills: Decimal;         // 平均キル数（Decimal.js）
    avgPlacement: Decimal;     // 平均順位（Decimal.js）
    totalAliveTime: Decimal;   // 合計生存時間（Decimal.js）
};
```

---

## 注意事項

- ディレクトリ指定時は、更新日時が最も新しい .replay ファイルを処理します  
- Fortnite のアップデートにより挙動が変わる可能性があります  
- 本ツールの利用により発生した問題について、開発者は責任を負いません  
- フォークする場合は GitHub の Fork 機能を利用してください  

---

## 🔗 使用ライブラリ

- [FortniteReplayDecompressor](https://github.com/Shiqan/FortniteReplayDecompressor)  
  © Shiqan — 本プロジェクトは MIT ライセンスのもとで利用しています。