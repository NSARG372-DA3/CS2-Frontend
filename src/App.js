import React, { useState } from "react";
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
  async function uploadImage(e) {
    e.preventDefault();
    if (!imageFile) return alert("Kies eers 'n image");
    setLoading(true);
    setOcrResult(null);
    try {
      const base64 = await toBase64(imageFile);
      console.log(base64);
      const res = await fetch(`${ocrApiBase}/extract_table`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: base64 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "unknown" }));
        throw new Error(err.error || res.statusText);
      }
      const data = await res.json();
      setOcrResult(data);
    } catch (err) {
      setOcrResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  }

  // function toBase64(file) {
  //   return new Promise((resolve, reject) => {
  //     const reader = new FileReader();
  //     reader.readAsDataURL(file);
  //     reader.onload = () => resolve(reader.result.split(",")[1]); // strip prefix
  //     reader.onerror = (error) => reject(error);
  //   });
  // }
  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        // Strip off the prefix if you only want the raw Base64
        const base64String = reader.result.replace(
          /^data:image\/[a-zA-Z]+;base64,/,
          ""
        );
        resolve(base64String);
      };

      reader.onerror = (error) => reject(error);

      reader.readAsDataURL(file); // reads the file and triggers onload
    });
  }

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
  function getFavoriteGun() {
    if (!steamResult) return null;

    // map keys => label (match your stat names)
    const guns = [
      {
        key: "total_hits_deagle",
        label: "Deagle",
        hits: getStat("total_hits_deagle") || 0,
      },
      {
        key: "total_hits_glock",
        label: "Glock",
        hits: getStat("total_hits_glock") || 0,
      },
      {
        key: "total_hits_awp",
        label: "AWP",
        hits: getStat("total_hits_awp") || 0,
      },
      {
        key: "total_hits_ak47",
        label: "AK-47",
        hits: getStat("total_hits_ak47") || 0,
      },
      {
        key: "total_hits_m4a1",
        label: "M4A1",
        hits: getStat("total_hits_m4a1") || 0,
      },
      {
        key: "total_hits_hkp2000",
        label: "P2000/HKP2000",
        hits: getStat("total_hits_hkp2000") || 0,
      },
    ];

    // find max
    let max = guns[0];
    for (const g of guns) {
      if ((g.hits || 0) > (max.hits || 0)) max = g;
    }

    // if all zero, return null
    if (!max || (max.hits || 0) === 0) return null;
    return { key: max.key, label: max.label, hits: max.hits };
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
    const hitsDeagle = getStat("total_hits_deagle") || 0;
    const hitsGlock = getStat("total_hits_glock") || 0;
    const hitsAwp = getStat("total_hits_awp") || 0;
    const hitsAk = getStat("total_hits_ak47") || 0;
    const hitsM4 = getStat("total_hits_m4a1") || 0;
    const hits2000 = getStat("total_hits_hkp2000") || 0;
    const totalHits =
      hitsDeagle + hitsGlock + hitsAwp + hitsAk + hitsM4 + hits2000;

    const headshots = getStat("total_kills_headshot");

    const damage = getStat("total_damage_done");
    const rounds = getStat("total_rounds_played");

    const contrib = getStat("total_contribution_score");
    const mvps = getStat("total_mvps");

    const dust2Wins = getStat("total_wins_map_de_dust2");
    const infernoWins = getStat("total_wins_map_de_inferno");

    // --- Computed metrics
    const winLossRatio =
      wins !== null && losses > 0 ? (wins / losses).toFixed(2) : null;
    const kdRatio =
      kills !== null && deaths > 0 ? (kills / deaths).toFixed(2) : null;
    const accuracy = shots > 0 ? ((totalHits / shots) * 100).toFixed(1) : null;
    const hsPercent = kills > 0 ? ((headshots / kills) * 100).toFixed(1) : null;
    const dmgPerRound = rounds > 0 ? (damage / rounds).toFixed(1) : null;
    const contribPerRound = rounds > 0 ? (contrib / rounds).toFixed(1) : null;
    const mvpsPerMatch = played > 0 ? (mvps / played).toFixed(1) : null;
    const favorite = getFavoriteGun();
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
              Accuracy: <b>{accuracy}%</b> ({totalHits} hits out of {shots}{" "}
              shots)
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
          {favorite && (
            <li>
              Favorite gun: <b>{favorite.label}</b> ({favorite.hits} hits)
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
          {dust2Wins !== null && infernoWins !== null && (
            <li>
              Map performance: Dust2 (<b>{dust2Wins}</b> round wins) vs Inferno
              (<b>{infernoWins}</b> round wins)
            </li>
          )}
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
