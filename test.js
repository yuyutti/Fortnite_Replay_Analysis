const fs = require("fs");
const { ReplayAnalysis } = require("./index");

(async () => {
    const {
        rawReplayData,
        rawPlayerData,
        processedPlayerInfo,
        processedPlacementInfo
    } = await ReplayAnalysis("./replay/TournamentMatch_fa830b4eec794339a43e4a8d192120e1.replay", {
        bot: false,
        sort: true
    });

    // fsで/output/にjsonを保存する
    fs.writeFileSync("./output/rawReplayData.json", JSON.stringify(rawReplayData, null, 4));
    fs.writeFileSync("./output/rawPlayerData.json", JSON.stringify(rawPlayerData, null, 4));
    fs.writeFileSync("./output/processedPlayerInfo.json", JSON.stringify(processedPlayerInfo, null, 4));
    fs.writeFileSync("./output/processedPlacementInfo.json", JSON.stringify(processedPlacementInfo, null, 4));
})();