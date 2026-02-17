## 🌐 Language

- [English](./README.md)
- [日本語](./README.ja.md)

# Fortnite Replay Analysis

A Node.js library that parses Fortnite .replay files  
and allows you to process player information, team placements,  
survival time, and score calculation in a single workflow.

---

## Features

✅ Directly parses Fortnite .replay files  
✅ Windows / Linux support (self-contained binary)  
✅ Accurately reconstructs team placements from KillFeed  
※Team placements are reconstructed by analyzing the elimination order from KillFeed events.  
✅ Bot exclusion and placement sorting  
✅ Supports both team-based and individual kill scoring  
✅ Automatically merges scores across multiple matches  
✅ Calculates average kills, average placement, and total survival time  
✅ High-precision calculations using Decimal.js  
※ Decimal.js is used internally. No additional installation is required.  

---

## Requirements

- Node.js 18 or later recommended  
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

### Replay Analysis (automatically selects the latest .replay file)

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

#### Specify a single replay file

```js
await ReplayAnalysis("./replay/match1.replay");
```

---

## Score Calculation (single match)

Uses the result of ReplayAnalysis directly  
to calculate placement points and kill points.

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

※ sortScores is automatically executed inside calculateScore,  
so the returned result is already sorted according to official rules.

---

## Re-sorting Scores Only

Use this when you want to re-sort an existing score array  
according to official rules.

```js
const { sortScores } = require("fortnite-replay-analysis");

const sortedScores = sortScores([...scores]);
```

※ sortScores mutates the array directly,  
so it is recommended to pass a copied array using the spread operator.

---

## Merging Scores Across Multiple Matches

Merge score arrays from multiple matches  
on a per-party basis with identical member composition.

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

Parses a Fortnite .replay file and returns  
raw data, processed player information,  
and team placement data reconstructed from KillFeed.

### Parameters

- inputPath (string)  
  Path to a .replay file, or a directory containing .replay files.  
  When a directory is specified,  
  the most recently updated .replay file is selected automatically.

- options (object, optional)

  - bot (boolean)  
    Whether to include bot players  
    Default: false  
    When false, bots are excluded from processedPlayerInfo.

  - sort (boolean)  
    Whether to sort processedPlayerInfo by Placement in ascending order  
    Default: true

### Return Value

Promise of ReplayAnalysisResult

```ts
type ReplayAnalysisResult = {
    rawReplayData: any;                      // Raw parsed replay data
    rawPlayerData: any[];                    // parsed.PlayerData
    processedPlayerInfo: {
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

- raw: Placement data directly obtained from the replay file  
- generated: Placement reconstructed solely from KillFeed events  
- hybrid: Uses replay placement data when available, otherwise falls back to KillFeed reconstruction  

---

## calculateScore(config)

Aggregates scores on a team or individual basis  
using processedPlayerInfo from ReplayAnalysis.

### Parameters

- matchData (PlayerInfo[] | string, required)  
  The processedPlayerInfo array from ReplayAnalysis,  
  or a path to a JSON file containing that array.  
  ※ The JSON file must contain the array itself.

- points (Record<number, number>, required)  
  Placement-based point configuration

  ```js
  {
      1: 11,
      2: 6,
      3: 3
  }
  ```

  ※ Placements not specified are treated as 0 points.

- killMode ("team" | "individual", "team_per_match_individual_total")  
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

### Return Value

Promise of PartyScore array

```ts
type PartyScore = {
    playerId: number | null;
    partyNumber: number;
    partyPlacement: number | null;
    partyKills: number;
    partyKillsNoLimit: number;
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

### Notes

- sortScores is automatically executed internally  
- The returned array is always sorted according to official rules  
- In individual mode, the aggregation key is playerId  

---

## sortScores(scoreArray)

Sorts a score array according to official rules.

### Sorting Priority

1. Total points  
2. Victory Royale count  
3. Average kills  
4. Average placement (lower is better)  
5. Total survival time  
6. Party number from the first match (final tie-breaker)

### Destructive Behavior

Calling sortScores directly mutates the array.

Safe usage:

```js
sortScores([...scores]);
```

※ sortScores uses Array.prototype.sort and is therefore destructive.

---

## mergeScores(scoreArrays)

Parties are matched using Epic Account IDs of members, regardless of order.

Merges score arrays from multiple matches  
on a per-party basis with identical member composition.

### Return Value

Each party includes an additional overallSummary.

```ts
type OverallSummary = {
    totalPoint: number;
    victoryCount: number;
    matchCount: number;
    avgKills: Decimal;
    avgPlacement: Decimal;
    totalAliveTime: Decimal;
};
```

---

## Notes

- When a directory is specified, the most recently updated .replay file is used  
- Behavior may change due to Fortnite updates  
- The developer is not responsible for any issues caused by using this tool  
- Please use GitHub’s Fork feature when forking this project  

---

## 🔗 Libraries Used

- [FortniteReplayDecompressor](https://github.com/Shiqan/FortniteReplayDecompressor)  
  © Shiqan — Used under the MIT License