import axios from "axios";

// Load config game dari CMS berdasarkan event_slug
export async function loadConfig() {
  try {
    // Ambil query string dari URL
    const params = new URLSearchParams(window.location.search);

    const eventSlug = params.get("event_slug");
    const apiBaseUrl = params.get("api_base_url");

    // Validasi query
    if (!eventSlug || !apiBaseUrl) {
      throw new Error("event_slug atau api_base_url tidak ditemukan di query string");
    }

    // Bentuk endpoint CMS
    const url = `${apiBaseUrl}/events/${eventSlug}/game-config`;

    console.log("LOAD CONFIG FROM:", url);

    // Request config ke CMS
    const res = await axios.get(url);

    return res.data;
  } catch (err) {
    console.error("❌ GAGAL LOAD CMS:", err);

    // fallback kalau gagal
    return null;
  }
}