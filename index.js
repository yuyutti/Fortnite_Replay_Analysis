const os = require('os');
const fs = require('fs');
const path = require('path');
const Decimal = require('decimal.js');
const { execFile } = require('child_process');

function getBinaryPath() { // OS判定して自己完結バイナリの実行ファイルパスを返す
    const baseDir = path.resolve(__dirname, 'CSproj', 'bin', 'Release', 'net8.0');

    switch (os.platform()) {
        case 'win32':
            return path.join(baseDir, 'win-x64', 'publish', 'FortniteReplayAnalysis.exe');
        case 'linux':
            return path.join(baseDir, 'linux-x64', 'publish', 'FortniteReplayAnalysis');
        default:
            throw new Error(`Unsupported platform: ${os.platform()}`);
    }
}

function ReplayAnalysis(inputPath, { bot = false, sort = true } = {}) { // Fortniteのリプレイファイルを解析してプレイヤーデータを返す
    return new Promise((resolve, reject) => {

        let replayFilePath;

        try {
            const stat = fs.statSync(inputPath);
            if (stat.isDirectory()) {
                const files = fs.readdirSync(inputPath)
                    .filter(f => f.endsWith('.replay'))
                    .map(f => ({ f, t: fs.statSync(path.join(inputPath, f)).mtimeMs }))
                    .sort((a, b) => b.t - a.t); // 新しい順
                if (files.length === 0) {
                    return reject(new Error(`No .replay files found in directory: ${inputPath}`));
                }
                replayFilePath = path.join(inputPath, files[0].f);
            } else if (stat.isFile()) {
                replayFilePath = inputPath;
            } else {
                return reject(new Error(`Invalid input path: ${inputPath}`));
            }
        } catch (e) {
            return reject(new Error(`Failed to access path: ${e.message}`));
        }
        const binPath = getBinaryPath();

        execFile(binPath, [replayFilePath], { maxBuffer: 1024 * 1024 * 20 }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Execution error: ${error.message}`));
                return;
            }
            if (stderr) {
                console.warn(`Warning: ${stderr}`);
            }

            let parsed;
            try {
                parsed = JSON.parse(stdout);
            } catch (jsonErr) {
                reject(new Error(`JSON parse error: ${jsonErr.message}`));
                return;
            }

            const playerData = parsed.PlayerData;

            try {

                if (!Array.isArray(playerData)) {
                    reject(new Error(`Unexpected JSON format: playerData is not an array.`));
                    return;
                }

                // 2位以下のDeathTimeDoubleを取得
                const secondPlaceAliveTimes = playerData
                    .filter(p => p.Placement !== 1)
                    .map(p => p.DeathTimeDouble)
                    .filter(t => t !== null && t !== undefined);

                // 2位がいなかったら0秒にする（または適宜）
                const maxSecondPlaceAliveTime = secondPlaceAliveTimes.length > 0
                    ? secondPlaceAliveTimes
                        .map(t => new Decimal(t))
                        .reduce((a, b) => Decimal.max(a, b))
                    : new Decimal(0);

                const playerInfo = playerData.map(player => {
                    const aliveTimeDecimal = player.DeathTimeDouble === null
                        ? maxSecondPlaceAliveTime.plus(new Decimal('1e-9'))
                        : new Decimal(player.DeathTimeDouble);

                    return {
                        partyNumber: player.TeamIndex,
                        Placement: player.Placement,
                        Kills: player.Kills,
                        TeamKills: player.TeamKills,
                        aliveTime: aliveTimeDecimal,
                        EpicId: player.EpicId,
                        PlayerName: player.PlayerName,
                        Platform: player.Platform,
                        IsBot: player.IsBot
                    };
                });

                let filteredAndSortedPlayerInfo = playerInfo;
                if (!bot) {
                    filteredAndSortedPlayerInfo = filteredAndSortedPlayerInfo.filter(p => p.IsBot === false);
                }
                if (sort) {
                    filteredAndSortedPlayerInfo = filteredAndSortedPlayerInfo.sort((a, b) => a.Placement - b.Placement);
                }

                resolve({
                    rawReplayData: parsed,
                    rawPlayerData: playerData,
                    processedPlayerInfo: filteredAndSortedPlayerInfo
                });
            } catch (jsonErr) {
                reject(new Error(`JSON parse error: ${jsonErr.message}`));
            }
        });
    });
}

async function calculateScore({ matchData, points, killCountUpperLimit = null, killPointMultiplier = 1 } = {}) {
    if (!matchData) throw new Error('matchData is required');

    let playerInfo;
    if (typeof matchData === 'string') {
        if (!fs.existsSync(matchData)) throw new Error(`Match data path does not exist: ${matchData}`);
        const rawData = fs.readFileSync(matchData, 'utf8');
        try {
            playerInfo = JSON.parse(rawData);
        } catch (e) {
            throw new Error(`Failed to parse JSON from file: ${e.message}`);
        }
    }
    else if (Array.isArray(matchData)) playerInfo = matchData;
    else {
        throw new Error('matchData must be either a file path (string) or parsed JSON array');
    }

    const partyScore = playerInfo.reduce((acc, player) => {
        if (!acc[player.partyNumber]) {
            const limitedKills = killCountUpperLimit == null
                ? (player.TeamKills || 0)
                : Math.min(player.TeamKills || 0, killCountUpperLimit);
            acc[player.partyNumber] = {
                partyPlacement: player.Placement,
                partyNumber: player.partyNumber,
                partyKills: limitedKills,
                partyKillsNoLimit: player.TeamKills || 0,
                partyKillPoints: (limitedKills) * killPointMultiplier,
                partyScore: (points[player.Placement] ?? 0) + ((limitedKills) * killPointMultiplier),
                partyPoint: points[player.Placement] ?? 0,
                partyVictoryRoyale: player.Placement === 1,
                partyKillsList: [],
                partyAliveTimeList: [],
                partyMemberList: [],
                partyMemberIdList: [],
                partyDiscordInfo: null
            };
        }
    
        // キル数の加算
        acc[player.partyNumber].partyKillsList.push(player.Kills || 0);
        acc[player.partyNumber].partyAliveTimeList.push(player.aliveTime || 0);
        acc[player.partyNumber].partyMemberList.push(player.PlayerName);
        acc[player.partyNumber].partyMemberIdList.push(player.EpicId);
    
        return acc;
    }, {});
    
    let result = Object.values(partyScore);
    result = sortScores(result);

    return result;
}

function mergeScores(scoreArrays) { // 複数マッチの結果をマージしてパーティごとに集計
    const map = new Map();
    scoreArrays.forEach(scores =>
        scores.forEach(p => {
            const key = JSON.stringify([...p.partyMemberIdList].sort());
            if (!map.has(key)) {
                map.set(key, {
                    partyScore: p.partyScore,
                    partyPoint: p.partyPoint,
                    partyKills: p.partyKills,
                    partyKillsNoLimit: p.partyKillsNoLimit,
                    partyKillPoints: p.partyKillPoints,
                    partyVictoryRoyaleCount: p.partyVictoryRoyale ? 1 : 0,
                    matchList: [p.matchName],
                    partyMemberList: [...p.partyMemberList],
                    partyDiscordInfo: p.partyDiscordInfo ? [ ...p.partyDiscordInfo ] : undefined,
                    partyAliveTimeByMatch: [
                        { match: p.matchName, times: [...(p.partyAliveTimeList || [])] }
                    ],
                    partyPlacementList: [p.partyPlacement],
                    blockNames: p.blockName ? [p.blockName] : [],
                    matchs: { [p.matchName]: { ...p } }
                });
            } else {
                const ex = map.get(key);
                ex.partyScore              += p.partyScore;
                ex.partyPoint              += p.partyPoint;
                ex.partyKills              += p.partyKills;
                ex.partyKillsNoLimit       += p.partyKillsNoLimit;
                ex.partyKillPoints         += p.partyKillPoints;
                ex.partyVictoryRoyaleCount += p.partyVictoryRoyale ? 1 : 0;
                ex.matchList.push(p.matchName);
                ex.partyAliveTimeByMatch.push({
                    match: p.matchName,
                    times: [...(p.partyAliveTimeList || [])]
                });
                ex.partyPlacementList.push(p.partyPlacement);
                ex.matchs[p.matchName] = { ...p };
                if (p.blockName && !ex.blockNames.includes(p.blockName)) {
                    ex.blockNames.push(p.blockName);
                }
            }
        })
    );
    
    return Array.from(map.values());
}

function sortScores(arr) { // 公式準拠のスコアソート関数
    if (!Array.isArray(arr) || arr.length === 0) return arr;

    arr.forEach(p => {
        const matchCount = (p.matchList || []).length || 1;
        p.summary = {
            point: p.partyScore || 0,
            victoryCount: p.partyVictoryRoyaleCount ?? (p.partyVictoryRoyale ? 1 : 0),
            matchCount,
            // Decimalを使って計算
            avgKills: matchCount > 0
                ? new Decimal(p.partyKills || 0).dividedBy(matchCount)
                : new Decimal(p.partyKills || 0),
            avgPlacement: Array.isArray(p.partyPlacementList) && p.partyPlacementList.length > 0 && matchCount > 0
                ? new Decimal(p.partyPlacementList.reduce((sum, val) => sum + val, 0)).dividedBy(matchCount)
                : new Decimal(p.partyPlacement || 0),
            totalAliveTime: sumMaxAliveTime(p.partyAliveTimeList, p.partyAliveTimeByMatch),
        };
    });

    return arr.sort((a, b) => {
        // 1. 累計獲得ポイント
        if (b.summary.point !== a.summary.point) {
            return b.summary.point - a.summary.point;
        }
        // 2. セッション中の累計 Victory Royale 回数
        if (b.summary.victoryCount !== a.summary.victoryCount) {
            return b.summary.victoryCount - a.summary.victoryCount;
        }

        // 3. 平均撃破数
        const cmpAvgKills = b.summary.avgKills.comparedTo(a.summary.avgKills);
        if (cmpAvgKills !== 0) {
            return cmpAvgKills;
        }

        // 4. 平均順位（小さいほうが上位）
        const cmpAvgPlacement = a.summary.avgPlacement.comparedTo(b.summary.avgPlacement);
        if (cmpAvgPlacement !== 0) {
            return cmpAvgPlacement;
        }

        // 5. 全マッチの合計生存時間
        const cmpTime = b.summary.totalAliveTime.comparedTo(a.summary.totalAliveTime);
        if (cmpTime !== 0) {
            return cmpTime;
        }

        // 6. 最終手段：1マッチ目のパーティ番号が小さい順
        const numA = Array.isArray(a.matchList) && a.matchList.length > 0
            ? a.matchs[a.matchList[0]].partyNumber
            : a.partyNumber;
        const numB = Array.isArray(b.matchList) && b.matchList.length > 0
            ? b.matchs[b.matchList[0]].partyNumber
            : b.partyNumber;
        return numA - numB;
    });
}

function sumMaxAliveTime(partyAliveTimeList, partyAliveTimeByMatch) {
    if (Array.isArray(partyAliveTimeByMatch) && partyAliveTimeByMatch.length > 0) {
        // 複数マッチ分の最大値を足す処理
        return partyAliveTimeByMatch.reduce((sum, match) => {
            if (!Array.isArray(match.times) || match.times.length === 0) return sum;
            const maxTime = match.times.reduce(
                (max, t) => {
                    const timeDec = new Decimal(t);
                    return timeDec.greaterThan(max) ? timeDec : max;
                },
                new Decimal(0)
            );
            return sum.plus(maxTime);
        }, new Decimal(0));
    }

    // こっちは単一マッチ用。配列の最大値返すだけ
    if (Array.isArray(partyAliveTimeList) && partyAliveTimeList.length > 0) {
        const maxVal = partyAliveTimeList.reduce(
            (max, t) => {
                const timeDec = new Decimal(t);
                return timeDec.greaterThan(max) ? timeDec : max;
            },
            new Decimal(0)
        );
        return maxVal;
    }

    return new Decimal(0);
}

module.exports = {
    ReplayAnalysis,
    calculateScore,
    sortScores,
    mergeScores
};