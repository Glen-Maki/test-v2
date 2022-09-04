import React, { useState, useRef, useEffect } from "react";
// faceapi
import * as faceapi from "face-api.js";
// three vrm
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRM, VRMSchema } from "@pixiv/three-vrm";
import { TNetInput } from "face-api.js";

// component
export const Test = () => {
  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);
  const [captureVideo, setCaptureVideo] = useState(false);
  const mountRef = useRef<HTMLDivElement>(null);

  // three関連 useState
  const [blinking, setBlinking] = useState<boolean>(false);
  const [smiling, setSmiling] = useState<boolean>(false);

  const [landmarkCanvas, setLandmarkCanvas] =
    useState<HTMLCanvasElement | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoHeight = 480;
  const videoWidth = 640;
  const VRMPath = `${window.location.origin}/AliciaSolid.vrm`;

  // const canvasRef = useRef<HTMLCanvasElement>(null);

  // three関連
  const scene = new THREE.Scene();
  const loader = new GLTFLoader();
  const camera = new THREE.PerspectiveCamera(
    30.0,
    videoWidth / videoHeight,
    0.1,
    20.0
  );
  const renderer = new THREE.WebGLRenderer();
  const light = new THREE.DirectionalLight(0xffffff, 1);
  const [vrm, setVRM] = useState<VRM | undefined>(undefined);
  const [lipDist, setLipDist] = useState<number | undefined>(undefined);
  const [headYawAngle, setHeadYawAngle] = useState<number | undefined>(
    undefined
  );
  const [prevHeadYawAngle, setPrevHeadYawAngle] = useState<number | undefined>(
    undefined
  );

  // VRM描画のdiv
  const elm = mountRef.current;
  const $body = document.querySelector("vtuber");
  const $avatarCanvas = renderer.domElement;
  $avatarCanvas.id = "avatar-canvas";

  // three.js settings
  renderer.setClearColor(0xeeeeee);
  renderer.setSize(videoWidth, videoHeight);
  camera.position.set(0.0, 1.35, 0.8);
  light.position.set(0, 100, 30);
  scene.add(light);
  const gridHelper = new THREE.GridHelper(10, 10);
  scene.add(gridHelper);
  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);
  const clock = new THREE.Clock();

  // 描画
  const render = () => {
    if (vrm && vrm.humanoid) {
      const deltaTime = clock.getDelta();
      let s = Math.sin(Math.PI * clock.elapsedTime);
      if (smiling) {
        s *= 2;
        vrm.blendShapeProxy?.setValue(VRMSchema.BlendShapePresetName.A, 0);
        vrm.blendShapeProxy?.setValue(VRMSchema.BlendShapePresetName.Joy, s);
        if (Math.abs(s) < 0.1) {
          setSmiling(false);
          vrm.blendShapeProxy?.setValue(VRMSchema.BlendShapePresetName.Joy, 0);
        }
      } else if (blinking) {
        s *= 5;
        vrm.blendShapeProxy?.setValue(VRMSchema.BlendShapePresetName.Blink, s);
        if (Math.abs(s) < 0.1) {
          setBlinking(false);
          vrm.blendShapeProxy?.setValue(
            VRMSchema.BlendShapePresetName.Blink,
            0
          );
        }
      }
      // vrm.blendShapeProxy.setValue( 'a', 0.5 + 0.5 * s );
      if (lipDist && !smiling) {
        // 初期距離(30)を引いて、口を最大限に開けた時を最大値とした時を参考に割合を決める
        let lipRatio = (lipDist - 30) / 25;
        if (lipRatio < 0) {
          lipRatio = 0;
        } else if (lipRatio > 1) {
          lipRatio = 1;
        }
        vrm.blendShapeProxy?.setValue(
          VRMSchema.BlendShapePresetName.A,
          lipRatio
        );
      }
      if (headYawAngle) {
        if (prevHeadYawAngle) {
          if (Math.abs(prevHeadYawAngle - headYawAngle) > 0.02) {
            // 変化を増幅させる
            const y = headYawAngle * 2.5;
            if (Math.abs(y) < Math.PI / 2) {
              vrm.humanoid.getBoneNode(
                VRMSchema.HumanoidBoneName.Head
              )!.rotation.y = y;
            }
          }
        }
        setPrevHeadYawAngle(headYawAngle);
      }

      vrm.humanoid.getBoneNode(
        VRMSchema.HumanoidBoneName.LeftUpperArm
      )!.rotation.z = Math.PI / 3;
      vrm.humanoid.getBoneNode(
        VRMSchema.HumanoidBoneName.RightUpperArm
      )!.rotation.z = -Math.PI / 3;

      // update vrm
      vrm.update(deltaTime);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  };

  const loop = async (video: any) => {
    if (!faceapi.nets.tinyFaceDetector.params) {
      setTimeout(() => loop(video));
    }
    // Exampleを参考に設定
    const option = new faceapi.TinyFaceDetectorOptions({
      inputSize: 224,
      scoreThreshold: 0.5,
    });
    const result = await faceapi
      .detectSingleFace(video, option)
      .withFaceLandmarks()
      .withFaceExpressions();
    if (result) {
      // デバッグをしつつ決めた値をスレッショルドとする(表情筋が硬い場合は下げようね！)
      if (result.expressions.happy > 0.7) {
        console.log("egao");
        setSmiling(true);
      }
      // 頭部回転角度を鼻のベクトルに近似する
      // 68landmarksの定義から鼻のベクトルを求める
      const upperNose = result.landmarks.positions[27];
      const lowerNose = result.landmarks.positions[30];
      const noseVec = lowerNose.sub(upperNose);
      const noseVec2 = new THREE.Vector2(noseVec.x, noseVec.y);
      // angle関数はx+方向を基準に角度を求めるため、π/2引いておき、逆回転のマイナスをかける
      setHeadYawAngle(-(noseVec2.angle() - Math.PI / 2));
      // リップシンク
      // 68landmarksの定義から、口の垂直距離を測る
      const upperLip = result.landmarks.positions[51];
      const lowerLip = result.landmarks.positions[57];
      setLipDist(lowerLip.y - upperLip.y);

      // デバッグ用にcanvasに表示する
      /*if (landmarkCanvas) {
        const dims = faceapi.matchDimensions(landmarkCanvas, video, true);
        const resizedResult = faceapi.resizeResults(result, dims);
        faceapi.draw.drawFaceLandmarks(landmarkCanvas, resizedResult);
      }*/
    }

    setTimeout(() => loop(video));
  };

  // 瞬き設定
  setInterval(() => {
    if (Math.random() < 0.15) {
      setBlinking(true);
    }
  }, 1000);

  useEffect(() => {
    if ($body) {
      $body.insertBefore($avatarCanvas, $body.firstChild);
    }

    // canvas取得など
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    setLandmarkCanvas(canvas);

    // model読み込みなど
    const loadModels = async () => {
      const MODEL_URL = process.env.PUBLIC_URL + "/models";

      Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        // faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        // faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        // faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        faceapi.loadFaceLandmarkModel(MODEL_URL),
        faceapi.loadFaceExpressionModel(MODEL_URL),
      ]).then();
      console.log("model load completed");
      setModelsLoaded(true);
    };
    loadModels();

    // vrm モデル読み込み
    loader.load(
      VRMPath,
      (gltf) => {
        VRM.from(gltf).then((vrmModel) => {
          setVRM(vrmModel);
          scene.add(vrmModel.scene);
          if (vrmModel.humanoid?.getBoneNode(VRMSchema.HumanoidBoneName.Hips)) {
            vrmModel.humanoid.getBoneNode(
              VRMSchema.HumanoidBoneName.Hips
            )!.rotation.y = Math.PI;
          }
          console.log(vrm);
        });
      },
      (progress) =>
        console.log(
          "Loading model...",
          100.0 * (progress.loaded / progress.total),
          "%"
        ),
      (error) => console.error(error)
    );
  }, []);

  const startVideo = () => {
    setCaptureVideo(true);
    elm?.appendChild(renderer.domElement);
    render();
    navigator.mediaDevices
      .getUserMedia({ video: { width: 300 } })
      .then((stream) => {
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.play();

          console.log(vrm);
          loop(video);
        }
      })
      .catch((err) => {
        console.error("error:", err);
      });
  };

  /*
  const handleVideoOnPlay = () => {
    // いらないかも
    // landmark描画など
    setInterval(async () => {
      if (landmarkCanvas) {
        if (videoRef.current) {
          // canvasRef.current = faceapi.createCanvasFromMedia(videoRef.current);
          setLandmarkCanvas(faceapi.createCanvasFromMedia(videoRef.current));
        }
        const displaySize = {
          width: videoWidth,
          height: videoHeight,
        };

        faceapi.matchDimensions(landmarkCanvas, displaySize);

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
        const resizedDetections: any = faceapi.resizeResults(
          detections,
          displaySize
        );

        landmarkCanvas
          .getContext("2d")
          ?.clearRect(0, 0, videoWidth, videoHeight);

        landmarkCanvas &&
          faceapi.draw.drawDetections(landmarkCanvas, resizedDetections);

        landmarkCanvas &&
          faceapi.draw.drawFaceLandmarks(landmarkCanvas, resizedDetections);
        landmarkCanvas &&
          faceapi.draw.drawFaceExpressions(landmarkCanvas, resizedDetections);
      }
    }, 100);
  };
  */

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
            style={{ borderRadius: "10px" }}
          />
          <canvas id="canvas" style={{ position: "absolute" }} />
        </div>
        <div ref={mountRef} id="vtuber" />
      </div>
    </div>
  );
};
