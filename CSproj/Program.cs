using System;
using System.Threading.Tasks;
using Newtonsoft.Json;
using FortniteReplayReader;

public class Startup
{
    public static async Task<string> Invoke(string replayFile)
    {
        var reader = new ReplayReader();
        var replay = await Task.Run(() => reader.ReadReplay(replayFile));
        return JsonConvert.SerializeObject(replay, Formatting.Indented);
    }

    public static async Task Main(string[] args)
    {
        Console.OutputEncoding = System.Text.Encoding.UTF8;

        if (args.Length < 1)
        {
            Console.Error.WriteLine("Usage: dotnet run <replayFilePath>");
            Environment.Exit(1);
        }

        try
        {
            var playerDataJson = await Invoke(args[0]);
            Console.WriteLine(playerDataJson);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("===== ERROR =====");
            Console.Error.WriteLine(ex.ToString());
            Environment.Exit(1);
        }
    }
}