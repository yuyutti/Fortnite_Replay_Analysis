## 🌐 Language

- [English](./README.md)
- [日本語](./README.ja.md)

# Fortnite Replay Analysis

A Node.js library that parses Fortnite .replay files  
and provides player information, team placements, survival time,  
and score calculation in a single workflow.

---

## Features

✅ Directly parses Fortnite .replay files  
✅ Windows / Linux support (self-contained binary)  
✅ Accurately reconstructs team placements from KillFeed  
✅ Bot exclusion and placement sorting  
✅ Supports both team-based and individual kill scoring  
✅ Automatically merges scores across multiple matches  
✅ Calculates average kills, average placement, and total survival time  
✅ High-precision calculations using Decimal.js  

---

## Requirements

- Node.js 18 or later (recommended)  
- Windows x64 / Linux x64  

※ Tested with Node.js v22.22.0  
※ macOS is currently not supported

---

## Installation

```bash
npm install fortnite-replay-analysis@latest
```

---

## Usage

#### Replay Analysis (automatically selects the latest .replay file)

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

##### Specify a single replay file

```js
await ReplayAnalysis("./replay/match1.replay");
```

---

### Score Calculation (single match)

Uses the result of ReplayAnalysis directly  
to calculate placement points and kill points.

```js
const { calculateScore } = require("fortnite-replay-analysis");

const scores = await calculateScore({
    matchData: processedPlayerInfo,
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

※ sortScores is automatically executed inside calculateScore,  
so the returned array is already sorted according to official rules.

---

### Re-sorting Scores Only

Use this when you want to re-sort an existing score array  
according to the official rules.

```js
const { sortScores } = require("fortnite-replay-analysis");

const sortedScores = sortScores([...scores]);
```

※ sortScores mutates the array directly,  
so passing a copied array using the spread operator is recommended.

---

### Merging Scores Across Multiple Matches

Merges score arrays from multiple matches  
by party with the same member composition.

```js
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

Parses a Fortnite .replay file and returns  
raw data, processed player information,  
and team placements reconstructed from KillFeed.

#### Parameters

- inputPath (string)  
  Path to a .replay file or a directory containing .replay files.  
  If a directory is specified, the most recently updated .replay file  
  is selected automatically.

- options (object, optional)

  - bot (boolean)  
    Whether to include bot players  
    Default: false  
    When false, bots are excluded from processedPlayerInfo.

  - sort (boolean)  
    Whether to sort processedPlayerInfo by Placement in ascending order  
    Default: true

#### Return Value

Promise<ReplayAnalysisResult>

```ts
type ReplayAnalysisResult = {
    rawReplayData: object;                   // Raw parsed replay data
    rawPlayerData: PlayerData[];             // parsed.PlayerData
    processedPlayerInfo: PlayerInfo[];       // Processed player information
    processedPlacementInfo: {
        teams: TeamFromKillFeed[];           // Team placements reconstructed from KillFeed
        placement: Record<number, string[]>; // { 1: ["nameA","nameB"], 2: [...] }
    };
};
```

---

### calculateScore(config)

Aggregates scores on a team or individual basis  
using processedPlayerInfo from ReplayAnalysis.

#### Parameters

- config (object)

  - matchData (PlayerInfo[] | string, required)  
    processedPlayerInfo from ReplayAnalysis,  
    or a path to a JSON file containing that array.  
    ※ The JSON file must contain the array itself.

  - points (Record<number, number>, required)  
    Placement-to-point mapping

    ```js
    {
        1: 11,
        2: 6,
        3: 3
    }
    ```

    ※ Placements not specified are treated as 0 points.

  - killMode ("team" | "individual", optional)  
    Default: team  

    team  
    → Sums kills of all team members  

    individual  
    → Aggregates kills per player (partyNumber is preserved)

  - killCountUpperLimit (number | null, optional)  
    Kill count upper limit  
    Default: null (no limit)

  - killPointMultiplier (number, optional)  
    Point multiplier per elimination  
    Default: 1

#### Return Value

Promise<PartyScore[]>

```ts
type PartyScore = {
    playerId: number | null;          // Used only in individual mode
    partyNumber: number;
    partyPlacement: number;           // Placement for a single match

    partyKills: number;               // After applying upper limit
    partyKillsNoLimit: number;         // Without upper limit
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

#### Notes

- sortScores is automatically executed internally,  
  so the returned array is always sorted according to official rules.

- In individual mode, partyNumber is preserved,  
  but the aggregation key is playerId.

- partyKillsNoLimit represents kills before applying the limit,  
  while partyKills reflects the value after applying killCountUpperLimit.

---

### sortScores(scoreArray)

Sorts a score array according to official rules.

#### Sorting Priority

1. Total points (descending)  
2. Victory Royale count (descending)  
3. Average kills (descending)  
4. Average placement (ascending)  
5. Total survival time (descending)  
6. Party number from the first match (final tie-breaker)

#### Destructive Behavior

```js
sortScores(scores);
```

This call mutates the scores array directly.

Safe usage:

```js
sortScores([...scores]);
```

※ sortScores uses Array.prototype.sort and is therefore destructive.

---

### mergeScores(scoreArrays)

Merges score arrays from multiple matches  
by party with identical member composition.

#### Return Value

Each party includes an additional overallSummary.

```js
type OverallSummary = {
    totalPoint: number;        // Total score
    victoryCount: number;      // Victory Royale count
    matchCount: number;        // Number of matches
    avgKills: Decimal;         // Average kills (Decimal.js)
    avgPlacement: Decimal;     // Average placement (Decimal.js)
    totalAliveTime: Decimal;   // Total survival time (Decimal.js)
};
```

---

## Notes

- When a directory is specified, the most recently updated .replay file is used  
- Behavior may change due to Fortnite updates  
- The author is not responsible for any issues caused by using this tool  
- Please use GitHub’s Fork feature when forking this project  

---

## 🔗 Libraries Used

- [FortniteReplayDecompressor](https://github.com/Shiqan/FortniteReplayDecompressor)  
  © Shiqan — Used under the MIT License