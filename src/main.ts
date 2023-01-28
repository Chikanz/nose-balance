import './style.css';
import {matterSetup} from './matterSetup';
import * as faceapi from 'face-api.js';
import Matter from 'matter-js';

var errorCallback = function(e) {
  console.log('Reeeejected!', e);
  };

var video = document.querySelector('video');
  if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true }).then(function(stream) {
        //video.src = window.URL.createObjectURL(stream);
        video.srcObject = stream;
        video.play();
    });
}

await faceapi.loadSsdMobilenetv1Model('/models')
await faceapi.loadTinyFaceDetectorModel('/models')
await faceapi.loadFaceLandmarkTinyModel('/models')

const canvas = document.querySelector('canvas')
const input = document.getElementById('webcam')

var physics = matterSetup(document.querySelector('#root'));

console.log("Loaded");


let posBufferSize = 3;
let positionBuffer: {x : number, y: number; }[] = [];
let positionBufferIndex = 0;

var i = 0;
const render = async () => {
  const detections = await faceapi
    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks(true);
  const detectionsForSize = faceapi.resizeResults(detections, { width: input.offsetWidth, height: input.offsetHeight })
  // var ctx = canvas.getContext('2d');
  // ctx.clearRect(0, 0, canvas.width, canvas.height)
  // faceapi.draw.drawFaceLandmarks(canvas, detectionsForSize, { drawLines: false })

  if(detections[0])
  {
    //Get distance between eye left = 39 right = 42
    var left = detections[0].landmarks.positions[39];
    var right = detections[0].landmarks.positions[42];
    var distance = Math.sqrt(Math.pow(left.x - right.x, 2) + Math.pow(left.y - right.y, 2));


    //Get change scale of nose based on eye distance
    let maxDist = 100;
    var noseScale = distance / maxDist;
    noseScale = Math.max(0, Math.min(noseScale, 1));

    var pos = detections[0].landmarks.positions[30]; 

    //Add to buffer
    positionBuffer[positionBufferIndex] = pos;
    positionBufferIndex = (positionBufferIndex + 1) % posBufferSize;

    //Average buffer
    var avgPos = {x: 0, y: 0};
    for(var i = 0; i < posBufferSize; i++)
    {
      avgPos.x += positionBuffer[i].x;
      avgPos.y += positionBuffer[i].y;
    }

    physics.constraint.pointA = {x: avgPos.x / posBufferSize, y: avgPos.y / posBufferSize};

  
    // ctx.beginPath();
    // ctx.arc(pos.x, pos.y, 15 * noseScale, 0, 2 * Math.PI, false);
    // ctx.fillStyle = 'green';
    // ctx.fill();
  }
}

//reset the position of the nose when space is pressed
document.addEventListener('keydown', function(event) {
  if(event.keyCode == 32) {
    Matter.Body.setAngle(physics.boxA, 0);
        Matter.Body.setAngularVelocity(physics.boxA, 0);  
  }
});

setInterval(render, 1000 / 60)

