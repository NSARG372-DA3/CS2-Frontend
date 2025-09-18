import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";
function App() {
  const [steamId, setSteamId] = useState("");
  const [steamResult, setSteamResult] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // New state for similar players feature
  const [similarPlayers, setSimilarPlayers] = useState(null);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // New state for AI feedback feature
  const [aiFeedback, setAiFeedback] = useState(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const steamApiBase = "http://localhost:5001";
  const ocrApiBase = "http://localhost:5003";
  const dbApiBase = "http://localhost:5000"; // Added DB API URL
  const feedbackAPIBase = "http://localhost:5005";

  async function fetchCs2(e) {
    e.preventDefault();
    if (!steamId) return alert("Type in your Steam ID");
    setLoading(true);
    setSteamResult(null);
    setSimilarPlayers(null); // Reset on new search
    try {
      const res = await fetch(
        `${steamApiBase}/steam/user/${encodeURIComponent(steamId)}/cs2`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "unknown" }));
        throw new Error(err.error || res.statusText);
      }
      const data = await res.json();
      setSteamResult(data);
      console.log(data);
    } catch (err) {
      setSteamResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  }

  // New function to find similar players
  async function findSimilar() {
    if (!steamId) return;
    setLoadingSimilar(true);
    setSimilarPlayers(null);
    try {
      const res = await fetch(
        `${dbApiBase}/similar_players/${encodeURIComponent(steamId)}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "unknown" }));
        throw new Error(err.error || res.statusText);
      }
      const data = await res.json();
      setSimilarPlayers(data.results);
    } catch (err) {
      // Use an object to store error message for consistent handling
      setSimilarPlayers({ error: err.message });
    } finally {
      setLoadingSimilar(false);
    }
  }

  // New function to get AI feedback
  async function getAIFeedback() {
    if (!steamResult || steamResult.error) {
      alert("Please load player stats first");
      return;
    }

    setLoadingFeedback(true);
    setAiFeedback(null);

    try {
      // Extract relevant stats from steamResult
      const playerStats = {
        player: steamId,
        Kills: getStat("total_kills") || 0,
        Deaths: getStat("total_deaths") || 0,
        WinPerc:
          getStat("total_matches_won") && getStat("total_matches_played")
            ? (
                (getStat("total_matches_won") /
                  getStat("total_matches_played")) *
                100
              ).toFixed(1)
            : 0,
        HeadshotPerc:
          getStat("total_kills_headshot") && getStat("total_kills")
            ? (
                (getStat("total_kills_headshot") / getStat("total_kills")) *
                100
              ).toFixed(1)
            : 0,
        DMG: getStat("total_damage_done") || 0,
      };

      const res = await fetch(`${feedbackAPIBase}/get_feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_stats: playerStats }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "unknown" }));
        throw new Error(err.error || res.statusText);
      }

      const data = await res.json();
      setAiFeedback(data);
    } catch (err) {
      setAiFeedback({ error: err.message });
    } finally {
      setLoadingFeedback(false);
    }
  }
  // async function uploadImage(e) {
  //   e.preventDefault();
  //   if (!imageFile) return alert("Kies eers 'n image");
  //   setLoading(true);
  //   setOcrResult(null);
  //   try {
  //     const base64 = await toBase64(imageFile);
  //     console.log(base64);
  //     const res = await fetch(`${ocrApiBase}/extract_table`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ image_base64: base64 }),
  //     });
  //     if (!res.ok) {
  //       const err = await res.json().catch(() => ({ error: "unknown" }));
  //       throw new Error(err.error || res.statusText);
  //     }
  //     const data = await res.json();
  //     setOcrResult(data);
  //   } catch (err) {
  //     setOcrResult({ error: err.message });
  //   } finally {
  //     setLoading(false);
  //   }
  // }

  // function toBase64(file) {
  //   return new Promise((resolve, reject) => {
  //     const reader = new FileReader();
  //     reader.readAsDataURL(file);
  //     reader.onload = () => resolve(reader.result.split(",")[1]); // strip prefix
  //     reader.onerror = (error) => reject(error);
  //   });
  // }
  // function toBase64(file) {
  //   return new Promise((resolve, reject) => {
  //     const reader = new FileReader();

  //     reader.onload = () => {
  //       // Strip off the prefix if you only want the raw Base64
  //       const base64String = reader.result.replace(
  //         /^data:image\/[a-zA-Z]+;base64,/,
  //         ""
  //       );
  //       resolve(base64String);
  //     };

  //     reader.onerror = (error) => reject(error);

  //     reader.readAsDataURL(file); // reads the file and triggers onload
  //   });
  // }

  // Helper om 'n stat maklik te kry
  function getStat(name) {
    if (!steamResult || !steamResult.stats) return null;
    const stat = steamResult.stats.find((s) => s.name === name);
    return stat ? stat.value : null;
  }

  // New component to render the list of similar players
  function renderSimilarPlayers() {
    if (loadingSimilar)
      return <div style={{ marginTop: 12 }}>Soek vir spelers...</div>;
    if (!similarPlayers) return null;
    if (similarPlayers.error) {
      return (
        <div style={{ color: "red", marginTop: 12 }}>
          Fout: {similarPlayers.error}
        </div>
      );
    }
    if (similarPlayers.length === 0) {
      return (
        <div style={{ marginTop: 12 }}>
          No similar players found in the database.
        </div>
      );
    }

    return (
      <div style={{ marginTop: 16 }}>
        <h4>👥 Similar Players:</h4>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                borderBottom: "1px solid #000000ff",
                background: "#000000ff",
              }}
            >
              <th style={{ textAlign: "left", padding: 8 }}>Steam ID</th>
              <th style={{ textAlign: "left", padding: 8 }}>UserName</th>
              <th style={{ textAlign: "right", padding: 8 }}>Hours played</th>
              <th style={{ textAlign: "right", padding: 8 }}>Matches</th>
              <th style={{ textAlign: "right", padding: 8 }}>K/D</th>
            </tr>
          </thead>
          <tbody>
            {similarPlayers.map((player) => (
              <tr
                key={player.steam_id}
                style={{ borderBottom: "1px solid #eee" }}
              >
                <td style={{ padding: 8 }}>{player.steam_id}</td>
                <td style={{ padding: 8 }}>
                  {player.username || player.steam_id}
                </td>
                <td style={{ textAlign: "right", padding: 8 }}>
                  {player.total_hours}
                </td>
                <td style={{ textAlign: "right", padding: 8 }}>
                  {player.matches_played ?? "-"}
                </td>
                <td style={{ textAlign: "right", padding: 8 }}>
                  {player.kd_ratio != null
                    ? Number(player.kd_ratio).toFixed(2)
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // New component to render AI feedback
  function renderAIFeedback() {
    if (loadingFeedback)
      return <div style={{ marginTop: 12 }}>Generating AI feedback...</div>;
    if (!aiFeedback) return null;
    if (aiFeedback.error) {
      return (
        <div style={{ color: "red", marginTop: 12 }}>
          Error: {aiFeedback.error}
        </div>
      );
    }

    return (
      <div style={{ marginTop: 16 }}>
        <h4>🤖 AI Performance Analysis:</h4>
        <div
          style={{
            backgroundColor: "rgba(94, 129, 244, 0.15)",
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid #e9ecef",
            lineHeight: "1.6",
          }}
        >
          <ReactMarkdown
            components={{
              // Custom styling for different markdown elements
              h1: ({ children }) => (
                <h1
                  style={{
                    fontSize: "1.5em",
                    margin: "0 0 12px 0",
                    color: "#ffffffff",
                  }}
                >
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2
                  style={{
                    fontSize: "1.3em",
                    margin: "0 0 10px 0",
                    color: "#a7c7e8ff",
                  }}
                >
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3
                  style={{
                    fontSize: "1.1em",
                    margin: "0 0 8px 0",
                    color: "#66a9ecff",
                  }}
                >
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p style={{ margin: "0 0 12px 0", color: "#ffffffff" }}>
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul
                  style={{
                    margin: "0 0 12px 0",
                    paddingLeft: "20px",
                    color: "#ffffffff",
                  }}
                >
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol
                  style={{
                    margin: "0 0 12px 0",
                    paddingLeft: "20px",
                    color: "#fbfbfbff",
                  }}
                >
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li style={{ margin: "4px 0", lineHeight: "1.5" }}>
                  {children}
                </li>
              ),
              strong: ({ children }) => (
                <strong style={{ color: "#6e8efb", fontWeight: "bold" }}>
                  {children}
                </strong>
              ),
              em: ({ children }) => (
                <em style={{ color: "#8e44ad", fontStyle: "italic" }}>
                  {children}
                </em>
              ),
              code: ({ children }) => (
                <code
                  style={{
                    backgroundColor: "#f8f9fa",
                    padding: "2px 4px",
                    borderRadius: "3px",
                    fontFamily: "monospace",
                    fontSize: "0.9em",
                    color: "#ffffffff",
                  }}
                >
                  {children}
                </code>
              ),
              blockquote: ({ children }) => (
                <blockquote
                  style={{
                    borderLeft: "4px solid #3498db",
                    margin: "12px 0",
                    paddingLeft: "16px",
                    fontStyle: "italic",
                    color: "#ffffffff",
                  }}
                >
                  {children}
                </blockquote>
              ),
            }}
          >
            {aiFeedback.feedback}
          </ReactMarkdown>
        </div>
      </div>
    );
  }
  // Expand favorite gun detection
  function getFavoriteGun() {
    if (!steamResult) return null;

    const gunKeys = [
      { key: "total_hits_ak47", label: "AK-47" },
      { key: "total_hits_m4a1", label: "M4A1" },
      { key: "total_hits_awp", label: "AWP" },
      { key: "total_hits_deagle", label: "Deagle" },
      { key: "total_hits_glock", label: "Glock" },
      { key: "total_hits_hkp2000", label: "P2000/HKP2000" },
      { key: "total_hits_p90", label: "P90" },
      { key: "total_hits_mac10", label: "MAC-10" },
      { key: "total_hits_mp7", label: "MP7" },
      { key: "total_hits_mp9", label: "MP9" },
      { key: "total_hits_negev", label: "Negev" },
      { key: "total_hits_bizon", label: "PP-Bizon" },
      { key: "total_hits_scar20", label: "SCAR-20" },
      { key: "total_hits_ssg08", label: "SSG 08" },
      { key: "total_hits_nova", label: "Nova" },
      { key: "total_hits_mag7", label: "MAG-7" },
      { key: "total_hits_xm1014", label: "XM1014" },
      { key: "total_hits_m249", label: "M249" },
      { key: "total_hits_galilar", label: "Galil AR" },
      { key: "total_hits_aug", label: "AUG" },
      { key: "total_hits_famas", label: "FAMAS" },
      { key: "total_hits_sg556", label: "SG 556" },
      { key: "total_hits_ump45", label: "UMP-45" },
      { key: "total_hits_sawedoff", label: "Sawed-Off" },
    ];

    const guns = gunKeys.map((g) => ({
      ...g,
      hits: getStat(g.key) || 0,
    }));

    let max = guns.reduce((a, b) => (b.hits > a.hits ? b : a), guns[0]);
    if (!max || max.hits === 0) return null;

    return { key: max.key, label: max.label, hits: max.hits };
  }

  // Favorite map detection
  function getFavoriteMap() {
    if (!steamResult) return null;

    const mapKeys = [
      { key: "total_wins_map_de_dust2", label: "Dust II" },
      { key: "total_wins_map_de_inferno", label: "Inferno" },
      { key: "total_wins_map_de_nuke", label: "Nuke" },
      { key: "total_wins_map_de_train", label: "Train" },
      { key: "total_wins_map_de_cbble", label: "Cobblestone" },
      { key: "total_wins_map_cs_office", label: "Office" },
      { key: "total_wins_map_cs_italy", label: "Italy" },
      { key: "total_wins_map_cs_assault", label: "Assault" },
      { key: "total_wins_map_de_vertigo", label: "Vertigo" },
      { key: "total_wins_map_de_lake", label: "Lake" },
      { key: "total_wins_map_cs_militia", label: "Militia" },
    ];

    const maps = mapKeys.map((m) => ({
      ...m,
      wins: getStat(m.key) || 0,
    }));

    let max = maps.reduce((a, b) => (b.wins > a.wins ? b : a), maps[0]);
    if (!max || max.wins === 0) return null;

    return { key: max.key, label: max.label, wins: max.wins };
  }

  function renderPatterns() {
    if (!steamResult || steamResult.error) return null;

    // --- Base stats
    const wins = getStat("total_matches_won");
    const played = getStat("total_matches_played");
    const losses = played && wins !== null ? played - wins : null;

    const kills = getStat("total_kills");
    const deaths = getStat("total_deaths");

    const shots = getStat("total_shots_fired");
    const hits = getStat("total_shots_hit") || 0;

    const headshots = getStat("total_kills_headshot");

    const damage = getStat("total_damage_done");
    const rounds = getStat("total_rounds_played");

    const contrib = getStat("total_contribution_score");
    const mvps = getStat("total_mvps");

    const doms = getStat("total_dominations") || 0;
    const revenges = getStat("total_revenges") || 0;

    // --- Computed metrics
    const winLossRatio =
      wins !== null && losses > 0 ? (wins / losses).toFixed(2) : null;
    const kdRatio =
      kills !== null && deaths > 0 ? (kills / deaths).toFixed(2) : null;
    const accuracy = shots > 0 ? ((hits / shots) * 100).toFixed(1) : null;
    const hsPercent = kills > 0 ? ((headshots / kills) * 100).toFixed(1) : null;
    const dmgPerRound = rounds > 0 ? (damage / rounds).toFixed(1) : null;
    const contribPerRound = rounds > 0 ? (contrib / rounds).toFixed(1) : null;
    const mvpsPerMatch = played > 0 ? (mvps / played).toFixed(1) : null;

    const favoriteGun = getFavoriteGun();
    const favoriteMap = getFavoriteMap();

    return (
      <div style={{ marginTop: 12 }}>
        <h4>📊 Patterns in your gameplay</h4>
        <ul>
          {wins !== null && played !== null && (
            <li>
              Win/Loss — You have won {wins} out of {played} matches.
              {winLossRatio && (
                <>
                  {" "}
                  (Ratio: <b>{winLossRatio}</b>)
                </>
              )}
            </li>
          )}
          {kdRatio && (
            <li>
              Kill/Death ratio: <b>{kdRatio}</b> ({kills} kills / {deaths}{" "}
              deaths)
            </li>
          )}
          {accuracy && (
            <li>
              Accuracy: <b>{accuracy}%</b> ({hits} hits out of {shots} shots)
            </li>
          )}
          {hsPercent && (
            <li>
              Headshot percentage: <b>{hsPercent}%</b> ({headshots} HS)
            </li>
          )}
          {dmgPerRound && (
            <li>
              Average damage per round: <b>{dmgPerRound}</b>
            </li>
          )}
          {favoriteGun && (
            <li>
              Favorite gun: <b>{favoriteGun.label}</b> ({favoriteGun.hits} hits)
            </li>
          )}
          {favoriteMap && (
            <li>
              Favorite map: <b>{favoriteMap.label}</b> ({favoriteMap.wins} wins)
            </li>
          )}
          {contribPerRound && (
            <li>
              Average contribution per round: <b>{contribPerRound}</b>
            </li>
          )}
          {mvpsPerMatch && (
            <li>
              MVPs per match: <b>{mvpsPerMatch}</b>
            </li>
          )}
          <li>
            Dominations: <b>{doms}</b>, Revenges: <b>{revenges}</b>
          </li>
        </ul>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <div className="brand">
          <div className="brand-logo" />
          <div className="brand-title">
            CS2 Insights — Patterns & Matchmaking
          </div>
        </div>
      </div>

      <div className="grid">
        <section className="card">
          <h3>Steam user stats</h3>
          <form onSubmit={fetchCs2} className="row">
            <input
              className="input"
              value={steamId}
              onChange={(e) => setSteamId(e.target.value)}
              placeholder="Steam64 ID (e.g. 7656119...)"
            />
            <button type="submit" className="btn">
              Load Stats
            </button>
          </form>
          {loading && (
            <div style={{ marginTop: 8, color: "#a7b3d1" }}>Loading...</div>
          )}
          {steamResult && !steamResult.error && renderPatterns()}
          {steamResult?.error && (
            <div className="pre" style={{ marginTop: 8 }}>
              Fout: {steamResult.error}
            </div>
          )}

          {steamId && (
            <div style={{ marginTop: 12 }}>
              <button
                onClick={findSimilar}
                disabled={loadingSimilar}
                className="btn"
              >
                {loadingSimilar ? "Searching..." : "Find similar players"}
              </button>
              {renderSimilarPlayers()}
            </div>
          )}

          {steamResult && !steamResult.error && (
            <div style={{ marginTop: 12 }}>
              <button
                onClick={getAIFeedback}
                disabled={loadingFeedback}
                className="btn"
                style={{ backgroundColor: "#28a745", marginTop: "8px" }}
              >
                {loadingFeedback
                  ? "Analyzing..."
                  : "Get AI Performance Analysis"}
              </button>
              {renderAIFeedback()}
            </div>
          )}
        </section>

        {/* <section className="card">
          <h3>OCR van image</h3>
          <form onSubmit={uploadImage} className="row">
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(e) =>
                setImageFile(e.target.files && e.target.files[0])
              }
            />
            <button type="submit" className="btn btn-secondary">
              Submit
            </button>
          </form>
          <pre className="pre" style={{ marginTop: 8 }}>
            {ocrResult
              ? JSON.stringify(ocrResult, null, 2)
              : "Geen OCR resultate nog"}
          </pre>
        </section> */}
      </div>
    </div>
  );
}

export default App;
//76561198787004874
