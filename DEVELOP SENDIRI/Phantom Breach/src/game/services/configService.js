import axios from "axios";

const API_URL = "https://your-api-url.com/config"; // ganti dengan API kamu

export const getGameConfig = async () => {
  try {
    const response = await axios.get(API_URL);
    return response.data;
  } catch (error) {
    console.error("Error ambil config:", error);
    return null;
  }
};