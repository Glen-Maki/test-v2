import React, { useState, useRef, useEffect } from "react";
// faceapi
// import * as faceapi from "face-api.js";
// three vrm
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRM, VRMSchema } from "@pixiv/three-vrm";

export const TestVrm = () => {
  // VRM描画のdiv
  const mountRef = useRef<HTMLDivElement>(null);
  const elm = mountRef.current;

  const videoHeight = 480;
  const videoWidth = 640;
  const VRMPath = `${window.location.origin}/AliciaSolid.vrm`;

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

  useEffect(() => {
    const $body = document.querySelector("vtuber");
    const $avatarCanvas = renderer.domElement;
    $avatarCanvas.id = "avatar-canvas";
    if ($body) {
      $body.insertBefore($avatarCanvas, $body.firstChild);
    }
    elm?.appendChild(renderer.domElement);

    // canvas取得など
    // const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    // const canvasContext = canvas.getContext("2d");
    // setLandmarkCanvas(canvas);

    // vrm モデル読み込み
    loader.load(
      VRMPath,
      (gltf) => {
        VRM.from(gltf).then((vrmModel) => {
          setVRM(vrmModel);
          if (vrmModel) {
            scene.add(vrmModel.scene);
            if (
              vrmModel.humanoid?.getBoneNode(VRMSchema.HumanoidBoneName.Hips)
            ) {
              vrmModel.humanoid.getBoneNode(
                VRMSchema.HumanoidBoneName.Hips
              )!.rotation.y = Math.PI;
            }
          }
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

  return <div ref={mountRef} />;
};
