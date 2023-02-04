import './style.css';
import { matterSetup, makePlayer } from './matterSetup';
import * as faceapi from 'face-api.js';
import Matter from 'matter-js';
import { Player } from './Types';

var errorCallback = function (e) {
  console.log('Reeeejected!', e);
};

var video = document.querySelector('video');

//Enable webcam
  if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({video: {
      width: { ideal: 1920  },
      height: { ideal: 1080 } 
  }  }).then(function(stream) {
        //video.src = window.URL.createObjectURL(stream);
        video.srcObject = stream;
        video.play();
    });
}

// await faceapi.loadSsdMobilenetv1Model('/models')
await faceapi.loadTinyFaceDetectorModel('/models')
await faceapi.loadFaceLandmarkTinyModel('/models')

const canvas = document.querySelector('canvas')
const input = document.getElementById('webcam')
const textDisplay = document.querySelector('h1');

var physics = matterSetup(document.querySelector('#root'));

console.log("Loaded");

let gameStarted = false; //Time between enter and game start
let gameRunning = false;

let countdownTimer = 4;

//init players
let playerCount = 0;
let players: Player[] = [];

let detections;

//Start game on enter pressed 
document.addEventListener('keydown', async function (event) {
  if (event.key == 'Enter') {

    if(gameStarted || gameRunning) return;

    gameStarted = true;
    console.log("Player count: " + playerCount);
    
    for (var i = 0; i < playerCount; i++) {

      var pos = detections[i].landmarks.positions[30];

      var player = makePlayer(pos);
      
      player.constraint.pointA = { x: pos.x, y: pos.y };
      player.lastPosition = pos;
      
      players.push(player);
    }

    const countDown = () => {
      countdownTimer -= 1;
      textDisplay.innerHTML = `${countdownTimer}`

      if(countdownTimer == 0){
        gameRunning = true;
        textDisplay.innerHTML = `Go!`

        setTimeout(() => {textDisplay.innerHTML = ``}, 1000);
      }
      else{
        setTimeout(countDown, 1000);
      }
    }

    countDown();
  }
});


let posBufferSize = 3;
let positionBufferIndex = 0;
// let positionBuffer: {x : number, y: number; }[] = [];

var ctx = canvas.getContext('2d');

const render = async () => {
  detections = await faceapi
    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks(true);

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if(!gameStarted){
      const detectionsForSize = faceapi.resizeResults(detections, { width: 1920, height: 1080 })
      faceapi.draw.drawFaceLandmarks(canvas, detectionsForSize, { drawLines: false })
    }

  if (!gameStarted) {
    playerCount = detections.length;
    textDisplay.innerHTML = `Detected ${detections.length} players. <br/> Press enter to start!`
  }

  let PlayerDetections = [];
  //Detections can be in any order, so compare the current position to the last to determine which player it is
  for (var i = 0; i < detections.length; i++) {
    if(!gameStarted) continue;
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
    if(!gameStarted) continue;

    let face = PlayerDetections[i];

    if(!face) continue;

    //Get distance between eye left = 39 right = 42
    var left = face.landmarks.positions[39];
    var right = face.landmarks.positions[42];
    var distance = Math.sqrt(Math.pow(left.x - right.x, 2) + Math.pow(left.y - right.y, 2));

    //Get change scale of nose based on eye distance
    // let maxDist = 100;
    // var noseScale = distance / maxDist;
    // noseScale = Math.max(0, Math.min(noseScale, 1));

    var pos = face.landmarks.positions[30];
    //players[i].constraint.pointA = { x: pos.x, y: pos.y };
    //players[i].lastPosition = pos;

    //Add to buffer
    players[i].posBuffer[positionBufferIndex] = pos;

    //Average buffer
    var avgPos = {x: 0, y: 0};
    let len = Math.min(posBufferSize, players[i].posBuffer.length);
    for(var j = 0; j < len; j++)
    {
      avgPos.x += players[i].posBuffer[j].x;
      avgPos.y += players[i].posBuffer[j].y;
    }

    let newPos = {x: avgPos.x / len, y: avgPos.y / len};

    players[i].lastPosition = newPos;
    players[i].constraint.pointA = newPos;
  }

  if(gameStarted) positionBufferIndex = (positionBufferIndex + 1) % posBufferSize;

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
    if(aliveCount == 1){
      textDisplay.innerHTML = `${players[winner].color} wins!`
    }
  }


  //Draw Crosses over eyes of dead players
  for (var i = 0; i < players.length; i++) {
    if(!players[i].alive){
      var left = PlayerDetections[i].landmarks.positions[39 + 1];
      var right = PlayerDetections[i].landmarks.positions[42 + 5];
      
      drawX(left.x, left.y);
      drawX(right.x, right.y);


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
  if(!gameRunning){
    Matter.Composite.allBodies(physics.engine.world).forEach(function (body) {
      Matter.Body.setAngle(body, 0);
      Matter.Body.setAngularVelocity(body, 0);
      Matter.Body.setVelocity(body, { x: 0, y: 0 });
    });
  }
  requestAnimationFrame(startGameFreeze);
}
startGameFreeze();

setInterval(render, 1000 / 60);

