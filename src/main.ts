import './style.css';
import { matterSetup, makePlayer } from './matterSetup';
import * as faceapi from 'face-api.js';
import Matter from 'matter-js';
import { Player } from './Types';

var errorCallback = function (e) {
  console.log('Reeeejected!', e);
};

var video = document.querySelector('video');
//   if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
//     navigator.mediaDevices.getUserMedia({video: {
//       width: { ideal: 1920  },
//       height: { ideal: 1080 } 
//   }  }).then(function(stream) {
//         //video.src = window.URL.createObjectURL(stream);
//         video.srcObject = stream;
//         video.play();
//     });
// }

await faceapi.loadSsdMobilenetv1Model('/models')
await faceapi.loadTinyFaceDetectorModel('/models')
await faceapi.loadFaceLandmarkTinyModel('/models')

const canvas = document.querySelector('canvas')
const input = document.getElementById('webcam')

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
  const detections = await faceapi
    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks(true);

  // const detectionsForSize = faceapi.resizeResults(detections, { width: input.offsetWidth, height: input.offsetHeight })
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  // faceapi.draw.drawFaceLandmarks(canvas, detectionsForSize, { drawLines: false })

  let PlayerDetections = [];
  //Detections can be in any order, so compare the current position to the last to determine which player it is
  for (var i = 0; i < detections.length; i++) {
    let face = detections[i];
    var pos = face.landmarks.positions[30];
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

    //Get distance between eye left = 39 right = 42
    var left = face.landmarks.positions[39];
    var right = face.landmarks.positions[42];
    var distance = Math.sqrt(Math.pow(left.x - right.x, 2) + Math.pow(left.y - right.y, 2));

    //Get change scale of nose based on eye distance
    // let maxDist = 100;
    // var noseScale = distance / maxDist;
    // noseScale = Math.max(0, Math.min(noseScale, 1));

    var pos = face.landmarks.positions[30];
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

setInterval(render, 1000 / 60);

