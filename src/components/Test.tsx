import React, { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";
import { TDrawDetectionsInput } from "face-api.js/build/commonjs/draw";

export const Test = () => {
  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);
  const [captureVideo, setCaptureVideo] = useState(false);

  const [context, setContext] = useState<HTMLCanvasElement | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoHeight = 480;
  const videoWidth = 640;
  // const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const canvasContext = canvas.getContext("2d");
    setContext(canvas);
  }, []);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = process.env.PUBLIC_URL + "/models";

      Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]).then();
      setModelsLoaded(true);
    };
    loadModels();
  }, []);

  const startVideo = () => {
    setCaptureVideo(true);
    navigator.mediaDevices
      .getUserMedia({ video: { width: 300 } })
      .then((stream) => {
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream as MediaStream;
          video.play();
        }
      })
      .catch((err) => {
        console.error("error:", err);
      });
  };

  const handleVideoOnPlay = () => {
    setInterval(async () => {
      if (context) {
        if (videoRef.current) {
          // canvasRef.current = faceapi.createCanvasFromMedia(videoRef.current);
          setContext(faceapi.createCanvasFromMedia(videoRef.current));
        }
        const displaySize = {
          width: videoWidth,
          height: videoHeight,
        };

        faceapi.matchDimensions(context, displaySize);

        let detections;
        if (videoRef.current) {
          detections = await faceapi
            .detectAllFaces(
              videoRef.current,
              new faceapi.TinyFaceDetectorOptions()
            )
            .withFaceLandmarks()
            .withFaceExpressions();
        }
        const resizedDetections = faceapi.resizeResults(
          detections,
          displaySize
        ) as TDrawDetectionsInput | TDrawDetectionsInput[] | any;

        context.getContext("2d")?.clearRect(0, 0, videoWidth, videoHeight);

        context && faceapi.draw.drawDetections(context, resizedDetections);

        context && faceapi.draw.drawFaceLandmarks(context, resizedDetections);
        context && faceapi.draw.drawFaceExpressions(context, resizedDetections);
      }
    }, 100);
  };

  const closeWebcam = () => {
    videoRef.current?.pause();
    setCaptureVideo(false);
  };

  return (
    <div>
      <div style={{ textAlign: "center", padding: "10px" }}>
        {captureVideo && modelsLoaded ? (
          <button
            onClick={closeWebcam}
            style={{
              cursor: "pointer",
              backgroundColor: "green",
              color: "white",
              padding: "15px",
              fontSize: "25px",
              border: "none",
              borderRadius: "10px",
            }}
          >
            Close Webcam
          </button>
        ) : (
          <button
            onClick={startVideo}
            style={{
              cursor: "pointer",
              backgroundColor: "green",
              color: "white",
              padding: "15px",
              fontSize: "25px",
              border: "none",
              borderRadius: "10px",
            }}
          >
            Open Webcam
          </button>
        )}
      </div>
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "10px",
          }}
        >
          <video
            ref={videoRef}
            height={videoHeight}
            width={videoWidth}
            onPlay={handleVideoOnPlay}
            style={{ borderRadius: "10px" }}
          />
          <canvas id="canvas" style={{ position: "absolute" }} />
        </div>
      </div>
    </div>
  );
};
