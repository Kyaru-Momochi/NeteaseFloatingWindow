using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;

class Program
{
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")] static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr hWnd, uint uCmd);
    const uint GW_OWNER = 4;

    static readonly HttpClient http = new();
    static string? lastCoverUrl;
    static string? lastCoverB64;

    static async Task<string?> FetchCover(string song, string artist)
    {
        try
        {
            var term = Uri.EscapeDataString($"{song} {artist}".Trim());
            var url = $"https://itunes.apple.com/search?term={term}&country=cn&media=music&limit=1";
            var json = await http.GetStringAsync(url);
            using var doc = JsonDocument.Parse(json);
            var results = doc.RootElement.GetProperty("results");
            if (results.GetArrayLength() == 0) return null;

            var artUrl = results[0].GetProperty("artworkUrl100").GetString()!;
            artUrl = artUrl.Replace("100x100bb", "600x600bb");
            if (artUrl == lastCoverUrl) return lastCoverB64;
            lastCoverUrl = artUrl;

            var bytes = await http.GetByteArrayAsync(artUrl);
            lastCoverB64 = Convert.ToBase64String(bytes);
            return lastCoverB64;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[smtc] Cover error: {ex.Message}");
            return null;
        }
    }

    static async Task<int> Main()
    {
        string lastTitle = "";
        var timer = new PeriodicTimer(TimeSpan.FromMilliseconds(1500));
        Console.Error.WriteLine("[smtc] Polling...");

        while (await timer.WaitForNextTickAsync())
        {
            try
            {
                var procIds = new HashSet<int>();
                foreach (var name in new[] { "cloudmusic", "netease-cloud-music" })
                    foreach (var p in Process.GetProcessesByName(name))
                    { procIds.Add(p.Id); p.Dispose(); }
                if (procIds.Count == 0) continue;

                string bestTitle = "";
                EnumWindows((hw, _) =>
                {
                    GetWindowThreadProcessId(hw, out uint pid);
                    if (!procIds.Contains((int)pid) || !IsWindowVisible(hw)) return true;
                    var sb = new StringBuilder(256);
                    GetWindowText(hw, sb, sb.Capacity);
                    var t = sb.ToString();
                    if (string.IsNullOrEmpty(t) || t is "桌面歌词" or "锁定歌词" or "Mini") return true;
                    if (t.Contains(" - ") && t.Length > bestTitle.Length) bestTitle = t;
                    return true;
                }, IntPtr.Zero);

                if (string.IsNullOrEmpty(bestTitle) || bestTitle == lastTitle) continue;
                lastTitle = bestTitle;

                var parts = bestTitle.Split(" - ");
                string songName = parts[0].Trim();
                string art = parts[^1].Trim();
                if (art.Contains("网易云") || art.Contains("NetEase"))
                    art = parts.Length >= 3 ? string.Join(" - ", parts[1..^1]).Trim() : "";
                else art = parts.Length >= 2 ? string.Join(" - ", parts[1..]).Trim() : "";
                if (string.IsNullOrEmpty(art)) art = "未知歌手";

                var cover = await FetchCover(songName, art);
                Console.Error.WriteLine($"[smtc] {songName} | {art} | cover={(cover != null ? "OK" : "no")}");

                Console.WriteLine(JsonSerializer.Serialize(new
                {
                    type = "track",
                    title = songName,
                    artist = art,
                    coverBase64 = cover ?? ""
                }));
                Console.Out.Flush();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[smtc] Error: {ex.Message}");
            }
        }
        return 0;
    }
}
