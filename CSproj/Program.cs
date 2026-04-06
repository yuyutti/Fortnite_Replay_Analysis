using System;
using Newtonsoft.Json;
using FortniteReplayReader;

public class Startup
{
    public static string Invoke(string replayFile)
    {
        var reader = new ReplayReader();
        var replay = reader.ReadReplay(replayFile);

#if DEBUG
        return JsonConvert.SerializeObject(replay, Formatting.Indented);
#else
        return JsonConvert.SerializeObject(replay, Formatting.None);
#endif
    }

    public static int Main(string[] args)
    {
        Console.OutputEncoding = System.Text.Encoding.UTF8;

        if (args.Length < 1)
        {
            Console.Error.WriteLine("Usage: FortniteReplayAnalysis <replayFilePath>");
            return 1;
        }

        try
        {
            var playerDataJson = Invoke(args[0]);
            Console.WriteLine(playerDataJson);
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("===== ERROR =====");
            Console.Error.WriteLine(ex.ToString());
            return 1;
        }
    }
}