
const API = "https://api.kickoffapi.com/api/v2";

const json = (status, data) => ({
  statusCode: status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  },
  body: JSON.stringify(data)
});

const normalize = s =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const isSlovenia = s =>
  /slovenia|slovenija/.test(normalize(s));

exports.handler = async () => {
  const key = process.env.KICKOFF_API_KEY;

  if (!key) {
    return json(503, {
      ok: false,
      message: "KICKOFF_API_KEY ni nastavljen."
    });
  }

  try {
    const from = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));

    const to = new Date(Date.UTC(new Date().getUTCFullYear(), 11, 31));
    

    const url = new URL(API + "/fixtures");
    url.searchParams.set("league", "5");
    url.searchParams.set("from", from.toISOString().slice(0, 10));
    url.searchParams.set("to", to.toISOString().slice(0, 10));
    url.searchParams.set("limit", "200");

    const res = await fetch(url, {
      headers: {
        "x-api-key": key,
        "Accept": "application/json"
      }
    });

    if (!res.ok) {
      return json(502, {
        ok: false,
        message: "Napaka pri pridobivanju tekem.",
        status: res.status
      });
    }

    const body = await res.json();

    if (!Array.isArray(body.data)) {
      return json(502, {
        ok: false,
        message: "Nepričakovan odgovor API-ja."
      });
    }

    const matches = body.data.filter(m =>
      isSlovenia(m.homeTeam?.name || m.home?.name) ||
      isSlovenia(m.awayTeam?.name || m.away?.name)
    );

    return json(200, {
      ok: true,
      matches,
      updated: new Date().toISOString()
    });

  } catch (error) {
    return json(502, {
      ok: false,
      message: "Povezava z API-jem ni uspela."
    });
  }
};
