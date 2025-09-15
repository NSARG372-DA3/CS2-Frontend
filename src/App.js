// src/App.js
import React, { useState } from "react";

function App() {
  const [steamId, setSteamId] = useState("");
  const [steamResult, setSteamResult] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const steamApiBase = "http://localhost:5001";
  const ocrApiBase = "http://localhost:5003";

  async function fetchCs2(e) {
    e.preventDefault();
    if (!steamId) return alert("Tik eers jou Steam ID in");
    setLoading(true);
    setSteamResult(null);
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
    } catch (err) {
      setSteamResult({ error: err.message });
    } finally {
      setLoading(false);
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

    return (
      <div style={{ marginTop: 12 }}>
        <h4>📊 Patrone in jou spel</h4>

        <ul>
          {wins !== null && played !== null && (
            <li>
              Wen:Verloor — Jy het {wins} van {played} wedstryde gewen.
              {winLossRatio && (
                <>
                  {" "}
                  (Verhouding: <b>{winLossRatio}</b>)
                </>
              )}
            </li>
          )}
          {kdRatio && (
            <li>
              Kill/Death verhouding: <b>{kdRatio}</b> ({kills} kills / {deaths}{" "}
              deaths)
            </li>
          )}
          {accuracy && (
            <li>
              Akkuraatheid: <b>{accuracy}%</b> ({totalHits} treffers uit {shots}{" "}
              skote)
            </li>
          )}
          {hsPercent && (
            <li>
              Headshot persentasie: <b>{hsPercent}%</b> ({headshots} HS)
            </li>
          )}
          {dmgPerRound && (
            <li>
              Gemiddelde skade per rondte: <b>{dmgPerRound}</b>
            </li>
          )}
          {contribPerRound && (
            <li>
              Gemiddelde bydrae per rondte: <b>{contribPerRound}</b>
            </li>
          )}
          {mvpsPerMatch && (
            <li>
              MVP’s per wedstryd: <b>{mvpsPerMatch}</b>
            </li>
          )}
          {dust2Wins !== null && infernoWins !== null && (
            <li>
              Kaart-prestasie: Dust2 (<b>{dust2Wins}</b> rondte wenne) vs
              Inferno (<b>{infernoWins}</b> rondte wenne)
            </li>
          )}
        </ul>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "24px auto",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h2>CS2 PoC — Steam en OCR</h2>

      <section
        style={{ padding: 12, border: "1px solid #ddd", marginBottom: 16 }}
      >
        <h3>1) Steam user stats</h3>
        <form onSubmit={fetchCs2}>
          <label>
            Steam64 ID:
            <input
              value={steamId}
              onChange={(e) => setSteamId(e.target.value)}
              placeholder="12345678901234567"
              style={{ marginLeft: 8 }}
            />
          </label>
          <button type="submit" style={{ marginLeft: 12 }}>
            Laai CS2 stats
          </button>
        </form>
        {loading && <div>Laai...</div>}
        {steamResult && !steamResult.error && renderPatterns()}
        {steamResult?.error && (
          <pre style={{ background: "#f7f7f7", padding: 12, marginTop: 8 }}>
            Fout: {steamResult.error}
          </pre>
        )}
      </section>

      <section style={{ padding: 12, border: "1px solid #ddd" }}>
        <h3>2) OCR van image</h3>
        <form onSubmit={uploadImage}>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files && e.target.files[0])}
          />
          <button type="submit" style={{ marginLeft: 12 }}>
            Submit
          </button>
        </form>
        <pre style={{ background: "#f7f7f7", padding: 12, marginTop: 8 }}>
          {ocrResult
            ? JSON.stringify(ocrResult, null, 2)
            : "Geen OCR resultate nog"}
        </pre>
      </section>
    </div>
  );
}

export default App;
