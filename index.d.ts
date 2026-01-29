import Decimal from "decimal.js";

export interface ProcessedPlayerInfo {
    playerId: number;
    partyNumber: number;
    Placement: number | null;
    fallbackPlacement?: number | null;

    Kills: number;
    TeamKills: number;
    aliveTime: Decimal;

    EpicId: string;
    PlayerName: string;
    Platform: string;

    IsBot: boolean;
    IsPartyLeader: boolean;
    IsReplayOwner: boolean;
    IsUsingAnonymousMode: boolean;
    IsUsingStreamerMode: boolean;
    HasThankedBusDriver: boolean;
    IsDisconnection: boolean

    matchName: string;
}

export interface PlacementTeam {
    teamIndex: number;
    placement: number;
    players: {
        epicId: string;
        epicName: string;
    }[];
}

export interface PlacementInfo {
    teams: PlacementTeam[];
    placement: Record<number, string[]>;
}

export interface ReplayAnalysisResult {
    rawReplayData: any;
    rawPlayerData: any[];

    processedPlayerInfo: {
        raw: ProcessedPlayerInfo[];
        generated: ProcessedPlayerInfo[];
        hybrid: ProcessedPlayerInfo[];
    };

    processedPlacementInfo: {
        raw: PlacementInfo;
        generated: PlacementInfo;
        hybrid: PlacementInfo;
    };
}

export interface ScoreSummary {
    point: number;
    victoryCount: number;
    matchCount: number;

    avgKills: Decimal;
    avgPlacement: Decimal;
    totalAliveTime: Decimal;
}

export interface ScoreResult {
    playerId: number | null;
    partyNumber: number;

    partyPlacement: number | null;
    partyKills: number;
    partyKillsNoLimit: number;
    partyKillPoints: number;

    partyPoint: number;
    partyScore: number;
    partyVictoryRoyale: boolean;

    partyKillsList: number[];
    partyAliveTimeList: Decimal[];

    partyMemberList: string[];
    partyMemberIdList: string[];

    partyDiscordIdList: string[] | null;
    partyDiscordInfo: any;

    matchName: string | null;

    summary?: ScoreSummary;
}

export interface MergedScoreResult {
    partyScore: number;
    partyPoint: number;
    partyKills: number;
    partyKillsNoLimit: number;
    partyKillPoints: number;

    partyVictoryRoyaleCount: number;

    matchList: string[];
    partyMemberList: string[];

    partyDiscordIdList?: string[];
    partyDiscordInfo?: any[];

    partyAliveTimeByMatch: {
        match: string;
        times: Decimal[];
    }[];

    partyPlacementList: number[];

    blockNames: string[];

    matchs: Record<string, ScoreResult>;

    overallSummary: {
        totalPoint: number;
        victoryCount: number;
        matchCount: number;

        avgKills: Decimal;
        avgPlacement: Decimal;
        totalAliveTime: Decimal;
    };
}

export function ReplayAnalysis(
    inputPath: string,
    options?: {
        bot?: boolean;
        sort?: boolean;
    }
): Promise<ReplayAnalysisResult>;

export function calculateScore(options: {
    matchData: string | ProcessedPlayerInfo[];
    points: Record<number, number>;
    killMode?: "team" | "individual";
    killCountUpperLimit?: number | null;
    killPointMultiplier?: number;
}): Promise<ScoreResult[]>;

export function sortScores<T extends ScoreResult>(arr: T[]): T[];

export function mergeScores(scoreArrays: ScoreResult[][]): MergedScoreResult[];