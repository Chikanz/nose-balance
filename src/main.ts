import './style.css';
import { matterSetup, makePlayer } from './matterSetup';
// import * as faceapi from 'face-api.js';
import Matter from 'matter-js';
import { Player } from './Types';

import '@mediapipe/face_mesh';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';


var video = document.querySelector('video');
  if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    await navigator.mediaDevices.getUserMedia({video: {
      width: { ideal: 1920  },
      height: { ideal: 1080 }, 
       frameRate: {ideal: 60},
  }  }).then(function(stream) {
        //video.src = window.URL.createObjectURL(stream);
        video.srcObject = stream;
        video.play();
    });
}

const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
const detectorConfig = {
  runtime: 'mediapipe', // or 'tfjs'
  solutionPath: "../node_modules/@mediapipe/face_mesh",
  maxFaces: 4,
}
const detector = await faceLandmarksDetection.createDetector(model, detectorConfig);


const canvas = document.querySelector('canvas')

var physics = matterSetup(document.querySelector('#root'));

console.log("Loaded");

let gameRunning = false;

//init players
const playerCount = 2;
let players: Player[] = [];

for (var i = 0; i < playerCount; i++) {
  players.push(makePlayer());
}

setTimeout(() => {
  gameRunning = true;
}, 3000);


// let posBufferSize = 3;
// let positionBuffer: {x : number, y: number; }[] = [];
// let positionBufferIndex = 0;

var i = 0;
const render = async () => {
  const estimationConfig = {
    flipHorizontal: false,
  };
  const detections = await detector.estimateFaces(video, estimationConfig);

  // const detectionsForSize = faceapi.resizeResults(detections, { width: input.offsetWidth, height: input.offsetHeight })
  var ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // console.log(detections);

  drawResults(ctx, detections, false, true);

  // return;

  let PlayerDetections = [];
  //Detections can be in any order, so compare the current position to the last to determine which player it is
  for (var i = 0; i < detections.length; i++) {
    let face = detections[i];
    var pos = face.keypoints[4];
    var closestPlayer = 0;
    var closestDistance = 100000000;
    for (var j = 0; j < players.length; j++) {
      var distance = Math.sqrt(Math.pow(pos.x - players[j].lastPosition.x, 2) + Math.pow(pos.y - players[j].lastPosition.y, 2));
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPlayer = j;
      }
    }
    PlayerDetections[closestPlayer] = face;
  }


  //Face update
  for (var i = 0; i < PlayerDetections.length; i++) {
    let face = PlayerDetections[i];

    var pos = face.keypoints[4];
    players[i].constraint.pointA = { x: pos.x, y: pos.y };
    players[i].lastPosition = pos;

    //Add to buffer
    // positionBuffer[positionBufferIndex] = pos;
    // positionBufferIndex = (positionBufferIndex + 1) % posBufferSize;

    //Average buffer
    // var avgPos = {x: 0, y: 0};
    // for(var i = 0; i < posBufferSize; i++)
    // {
    //   avgPos.x += positionBuffer[i].x;
    //   avgPos.y += positionBuffer[i].y;
    // }

    // physics.constraint.pointA = {x: avgPos.x / posBufferSize, y: avgPos.y / posBufferSize};
  }

  //Alive check
  if (gameRunning) {
    for (var i = 0; i < players.length; i++) {
      var angle = players[i].box.angle * 57.2958;
      if (angle > 90 || angle < -90 && players[i].alive) {
        players[i].alive = false;
        physics.Composite.remove(physics.engine.world, players[i].constraint);
        players[i].box.frictionAir = 0.001;
      }
    }
  }

  //Game start stop moving
  if(!gameRunning){
    Matter.Composite.allBodies(physics.engine.world).forEach(function (body) {
      Matter.Body.setAngle(body, 0);
      Matter.Body.setAngularVelocity(body, 0);
      Matter.Body.setVelocity(body, { x: 0, y: 0 });
    });
  }

}

//reset the position of the nose when space is pressed
document.addEventListener('keydown', function (event) {
  if (event.keyCode == 32) {
    //Loop all matter js bodies and set vecolity to 0
    Matter.Composite.allBodies(physics.engine.world).forEach(function (body) {
      Matter.Body.setAngle(body, 0);
      Matter.Body.setAngularVelocity(body, 0);
      Matter.Body.setVelocity(body, { x: 0, y: 0 });
    });
  }
});

function drawResults(ctx: CanvasRenderingContext2D | null, faces: any[], boundingBox: boolean, showKeypoints: boolean) {
  faces.forEach((face) => {
    const keypoints =
        face.keypoints.map((keypoint) => [keypoint.x, keypoint.y]);

    if (boundingBox) {
      ctx.strokeStyle = 'Red';
      ctx.lineWidth = 1;

      const box = face.box;
      drawPath(
          ctx,
          [
            [box.xMin, box.yMin], [box.xMax, box.yMin], [box.xMax, box.yMax],
            [box.xMin, box.yMax]
          ],
          true);
    }

    if (showKeypoints) {
      ctx.fillStyle = 'Green';

      for (let i = 0; i < 468; i++) {
        const x = keypoints[i][0];
        const y = keypoints[i][1];

        ctx.beginPath();
        ctx.arc(x, y, 3 /* radius */, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  });
}

function drawPath(ctx, points, closePath) {
  const region = new Path2D();
  region.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    region.lineTo(point[0], point[1]);
  }

  if (closePath) {
    region.closePath();
  }
  ctx.stroke(region);
}

setInterval(render, 1000 / 60);

