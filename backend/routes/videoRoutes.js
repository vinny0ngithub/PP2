import express from "express";
import multer from "multer";
import axios from "axios";
import ImageKit from "imagekit";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// 🟢 Multer Setup (For File Uploads)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 🟢 ImageKit Setup
const imagekit = new ImageKit({
  publicKey: process.env.IMAGE_KIT_PUBLIC_KEY,
  privateKey: process.env.IMAGE_KIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGE_KIT_ENDPOINT,
});

// 🟢 Video Upload Route
router.post("/upload", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    // 🟢 Upload to ImageKit
    const result = await imagekit.upload({
      file: req.file.buffer,
      fileName: req.file.originalname,
      folder: "/videos",
    });

    console.log("Uploaded Video URL:", result.url);

    res.json({ success: true, videoUrl: result.url });
  } catch (error) {
    console.error("Error uploading video:", error);
    res.status(500).json({ success: false, message: "Upload failed", error: error.message });
  }
});

// 🟢 Dubbing Route
router.post("/dub", async (req, res) => {
    try {
      const { videoUrl, sourceLanguage, targetLanguage } = req.body;
      if (!videoUrl || !sourceLanguage || !targetLanguage) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
      }
  
      console.log("Dubbing Request:", { videoUrl, sourceLanguage, targetLanguage });
  
      // 🟢 ElevenLabs API Request
      const response = await axios.post(
        "https://api.elevenlabs.io/v1/dubbing",
        {
          source_url: videoUrl,
          source_lang: sourceLanguage,
          target_lang: targetLanguage,
          mode: "automatic",
          dubbing_studio: false,
          num_speakers: 1,
          watermark: true,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": "sk_03a13341726eca6c5db597f230aecd75ec7c67b5bc66c5d4",
          },
        }
      );
  
      console.log("Dubbing API Response:", response.data);
      res.json({ success: true, dubbingId: response.data.dubbing_id });
  
    } catch (error) {
      console.error("Error in dubbing:", error.response?.data || error.message);
      res.status(500).json({ success: false, message: "Dubbing failed", error: error.message });
    }
  });
  

// 🟢 Check Dubbing Status & Get Dubbed Video URL
router.get("/dub-status/:dubbingId", async (req, res) => {
  try {
    const { dubbingId } = req.params;

    const metadataResponse = await axios.get(
      `https://api.elevenlabs.io/v1/dubbing/${dubbingId}/metadata`,
      {
        headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
      }
    );

    const metadata = metadataResponse.data;

    if (metadata.status === "dubbed") {
      return res.json({ success: true, videoUrl: metadata.video_url });
    } else if (metadata.status === "dubbing") {
      return res.json({ success: false, message: "Dubbing in progress" });
    } else {
      return res.status(500).json({ success: false, message: "Dubbing failed", error: metadata.error_message });
    }
  } catch (error) {
    console.error("Error fetching dubbing status:", error);
    res.status(500).json({ success: false, message: "Error fetching status", error: error.message });
  }
});

export default router;
