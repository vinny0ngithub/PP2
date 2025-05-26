import { useState, useRef } from "react";
import { IKContext, IKUpload } from "imagekitio-react";

const urlEndpoint = import.meta.env.VITE_IMAGE_KIT_ENDPOINT;
const publicKey = import.meta.env.VITE_IMAGE_KIT_PUBLIC_KEY;

const authenticator = async () => {
  const response = await fetch("http://localhost:3000/api/upload");
  if (!response.ok) throw new Error("Authentication request failed");
  return await response.json();
};

const VideoUpload = () => {
  const [videoUrl, setVideoUrl] = useState(null);
  const [dubbedVideoUrl, setDubbedVideoUrl] = useState(null);
  const [status, setStatus] = useState("");
  const ikUploadRef = useRef(null);

  const onSuccess = async (res) => {
    console.log("Uploaded Video URL:", res.url);
    setVideoUrl(res.url);

    console.log("Sending dubbing request:", {
        videoUrl: res.url,
        sourceLanguage: "en-US",
        targetLanguage: "hi-IN",
      });

    // 🟢 Start Dubbing Process
    setStatus("Dubbing in progress...");
    const dubResponse = await fetch("http://localhost:3000/api/video/dub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoUrl: res.url,
        sourceLanguage: "en",
        targetLanguage: "hi",
      }),
    });
    
    const dubData = await dubResponse.json();
    console.log("Dubbing Response:", dubData);

    if (!dubData.success) {
      setStatus("Dubbing failed!");
      return;
    }

    // 🟢 Check Dubbing Status
    const checkDubbingStatus = async () => {
      const statusResponse = await fetch(
        `http://localhost:3000/api/video/dub-status/${dubData.dubbingId}`
      );
      const statusData = await statusResponse.json();

      if (statusData.success) {
        setDubbedVideoUrl(statusData.videoUrl);
        setStatus("Dubbing completed!");
      } else {
        setTimeout(checkDubbingStatus, 5000); // Retry in 5 sec
      }
    };

    checkDubbingStatus();
  };

  return (
    <div>

      <IKContext urlEndpoint={urlEndpoint} publicKey={publicKey} authenticator={authenticator}>
        <IKUpload
          fileName="video.mp4"
          onSuccess={onSuccess}
          useUniqueFileName={true}
          style={{ display: "none" }}
          ref={ikUploadRef}
        />
      </IKContext>

      <button onClick={() => ikUploadRef.current.click()}>Video Dubbing</button>

      {status && <p>{status}</p>}

      {dubbedVideoUrl && (
        <div>
          <h3>Dubbed Video:</h3>
          <video src={dubbedVideoUrl} controls width="400" />
        </div>
      )}
    </div>
  );
};

export default VideoUpload;
