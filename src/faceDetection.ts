const videoElement = document.querySelector('video');
const canvasElement = document.querySelector('canvas');
const canvasCtx = canvasElement.getContext('2d');
const drawingUtils = window;

const controls = window;
const mpFaceDetection = window;

import results from './main';

function onResults(results) {

    console.log(results);

  // Draw the overlays.
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(
      results.image, 0, 0, canvasElement.width, canvasElement.height);
  if (results.detections.length > 0) {
    drawingUtils.drawRectangle(
        canvasCtx, results.detections[0].boundingBox,
        {color: 'blue', lineWidth: 4, fillColor: '#00000000'});
    drawingUtils.drawLandmarks(canvasCtx, results.detections[0].landmarks, {
      color: 'red',
      radius: 5,
    });
  }
  canvasCtx.restore();
}

const faceDetection = new FaceDetection({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4/${file}`;
}});
faceDetection.setOptions({
  model: 'short',
  minDetectionConfidence: 0.5
});
faceDetection.onResults(results);

//for some reason you can't set full right away
setTimeout(() => {
  faceDetection.setOptions({
    model: 'full',
    minDetectionConfidence: 0.5
  });
}, 1000);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await faceDetection.send({image: videoElement});
  },
  width: 1920,
  height: 1080
});
camera.start();