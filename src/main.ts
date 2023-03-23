import './style.css';
import { matterSetup, makePlayer } from './matterSetup';
import Matter from 'matter-js';
import { Player } from './Types';

// import '@mediapipe/face_mesh';
// import '@tensorflow/tfjs-core';
// import '@tensorflow/tfjs-backend-webgl';
// import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
// import { Face } from '@tensorflow-models/face-landmarks-detection';


var video = document.querySelector('video');

let faceDetection: any;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


const canvas = document.querySelector('canvas')
const textDisplay = document.querySelector('h1');

var physics = matterSetup(document.querySelector('#root'));

let gameStarted = false; //Time between enter and game start
let gameRunning = false;

let countdownTimer = 4;

//init players
let playerCount = 0;
let players: Player[] = [];

let detections: any[] = [];

let posBufferSize = 3;
let positionBufferIndex = 0;
// let positionBuffer: (string | any[])[] = [];
// let filteredPos: { x: number, y: number; }[] = []; //use this one

//Start game on enter pressed 
document.addEventListener('keydown', async function (event) {
  if (event.key == 'Enter') {

    if (gameStarted || gameRunning) return;

    gameStarted = true;
    console.log("Player count: " + playerCount);

    for (var i = 0; i < playerCount; i++) {

      var pos = detections[i].landmarks[2];

      var player = makePlayer(pos);

      player.constraint.pointA = { x: pos.x, y: pos.y };
      player.lastPosition = pos;

      players.push(player);
    }

    const countDown = () => {
      countdownTimer -= 1;
      textDisplay.innerHTML = `${countdownTimer}`

      if (countdownTimer == 0) {
        gameRunning = true;
        textDisplay.innerHTML = `Go!`

        setTimeout(() => { textDisplay.innerHTML = `` }, 1000);
      }
      else {
        setTimeout(countDown, 1000);
      }
    }

    countDown();
  }
});


//seed buffer
// for (var i = 0; i < 1; i++) {
//   positionBuffer.push([]);
//   for (var j = 0; j < posBufferSize; j++) {
//     positionBuffer[i][j] = { x: 0, y: 0 };
//   }
// }

var ctx = canvas.getContext('2d');

export default function onResults(results) {

  detections = results.detections;

  //Add position into buffer
  // for (var i = 0; i < detections.length; i++) {
  //   let face = detections[i];
  //   if(!face) continue;
  //   var pos = face.landmarks[2];
  //   positionBuffer[i][positionBufferIndex] = pos;
  // }

  //average out positions
  // for (var i = 0; i < positionBuffer.length; i++) {
  //   let pos = positionBuffer[i][0];
  //   for (var j = 1; j < positionBuffer[i].length; j++) {
  //     pos.x += positionBuffer[i][j].x;
  //     pos.y += positionBuffer[i][j].y;
  //   }
  //   pos.x /= positionBuffer[i].length;
  //   pos.y /= positionBuffer[i].length;

  //   // pos.x *= 1920;
  //   // pos.y *= 1080;

  //   filteredPos[i] = pos;
  // }

  // positionBufferIndex++;
  // positionBufferIndex = positionBufferIndex % posBufferSize;

  var ctx = canvas.getContext('2d');
  if (ctx == null || canvas == null) return;


  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw initial nose pos to give feedback
  if (!gameStarted) {
    for (var i = 0; i < playerCount; i++) {
      if(!detections[i]) continue;
      let pos = detections[i].landmarks[2];

      ctx.font = '100px serif'
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText('👃',pos.x * 1920, pos.y * 1080)
    }
  }

  if (!gameStarted) {
    playerCount = detections.length;
    textDisplay.innerHTML = `Detected ${results.detections.length} players. <br/> Press enter to start!`
  }

  let PlayerDetections = [];
  //Detections can be in any order, so compare the current position to the last to determine which player it is
  for (var i = 0; i < detections.length; i++) {
    if (!gameStarted) continue;
    let face = detections[i];
    var pos = face.landmarks[2];

    //multiple all landmarks to convert to canvas size
    for (var j = 0; j < face.landmarks.length; j++) {
      face.landmarks[j].x *= 1920;
      face.landmarks[j].y *= 1080;
    }

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
    if (!gameStarted) continue;

    let face = PlayerDetections[i];

    var pos = face.landmarks[2];
    players[i].constraint.pointA = { x: pos.x, y: pos.y };
    players[i].lastPosition = pos;

    //Add to buffer
    players[i].posBuffer[positionBufferIndex] = pos;

    //Average buffer
    var avgPos = { x: 0, y: 0 };
    let len = Math.min(posBufferSize, players[i].posBuffer.length);
    for (var j = 0; j < len; j++) {
      avgPos.x += players[i].posBuffer[j].x;
      avgPos.y += players[i].posBuffer[j].y;
    }

    let newPos = { x: avgPos.x / len, y: avgPos.y / len };
    // let newPos = pos;

    players[i].lastPosition = newPos;
    players[i].constraint.pointA = newPos;
  }

  if (gameStarted) positionBufferIndex = (positionBufferIndex + 1) % posBufferSize;

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

    //check for winner
    var aliveCount = 0;
    var winner = 0;
    for (var i = 0; i < players.length; i++) {
      if (players[i].alive) {
        aliveCount++;
        winner = i;
      }
    }
    if (aliveCount == 1) {
      textDisplay.innerHTML = `${players[winner].color} wins!! <br/> Refresh the page to restart`
    }
  }


  //Draw Crosses over eyes of dead players
  for (var i = 0; i < players.length; i++) {
    if (!players[i].alive) {
      var left = PlayerDetections[i].landmarks[0];
      var right = PlayerDetections[i].landmarks[1];

      drawX(left.x, left.y - 10);
      drawX(right.x, right.y - 10);
    }
  }
}

function drawX(x, y) {
  ctx.beginPath();

  ctx.moveTo(x - 20, y - 20);
  ctx.lineTo(x + 20, y + 20);

  ctx.moveTo(x + 20, y - 20);
  ctx.lineTo(x - 20, y + 20);

  ctx.strokeStyle = "black";
  ctx.lineWidth = 9;

  ctx.stroke();
}

//Stop bodies moving before starting
const startGameFreeze = () => {
  //Game start stop moving
  if (!gameRunning) {
    Matter.Composite.allBodies(physics.engine.world).forEach(function (body) {
      Matter.Body.setAngle(body, 0);
      Matter.Body.setAngularVelocity(body, 0);
      Matter.Body.setVelocity(body, { x: 0, y: 0 });
    });
  }
  requestAnimationFrame(startGameFreeze);
}
startGameFreeze();

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

