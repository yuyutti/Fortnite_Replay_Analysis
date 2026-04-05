const fs = require("fs");
const { ReplayAnalysis } = require("./index");

(async () => {
    const {
        rawReplayData,
        rawPlayerData,
        processedPlayerInfo,
        processedPlacementInfo
    } = await ReplayAnalysis("./replay/41-10client.replay", {
        bot: false,
        sort: true
    });

    // fsで/output/にjsonを保存する
    fs.writeFileSync("./output/rawReplayData.json", JSON.stringify(rawReplayData, null, 4));
    fs.writeFileSync("./output/rawPlayerData.json", JSON.stringify(rawPlayerData, null, 4));
    fs.writeFileSync("./output/processedPlayerInfo.json", JSON.stringify(processedPlayerInfo, null, 4));
    fs.writeFileSync("./output/processedPlacementInfo.json", JSON.stringify(processedPlacementInfo, null, 4));
})();