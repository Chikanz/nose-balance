import * as Matter from "matter-js";

var Engine = Matter.Engine,
Render = Matter.Render,
Runner = Matter.Runner,
Bodies = Matter.Bodies,
Constraint = Matter.Constraint,
Composite = Matter.Composite;

let engine: Matter.Engine | null = null;
let render = null;

export function matterSetup(root) {
  // module aliases

  // create an engine
  engine = Engine.create();

  // create a renderer
  render = Render.create({
    element: root,
    engine: engine,
    options: {
      width: 1920,
      height: 1080,
      wireframes: false,
    },
  });

  // run the renderer
  Render.run(render);

  // create runner
  var runner = Runner.create();

  // run the engine
  Runner.run(runner, engine);

  document.querySelectorAll('canvas')[1].style = "position: absolute; top: 0px; left: 0px; width:100%";

  return {engine, render, Composite, Bodies, Constraint};
}


let stickHeight = 500;

export function makePlayer(pos: {x: number, y: number}){

  if(!engine) return;

  //choose a random color
  const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  var box = Bodies.rectangle(pos.x, pos.y, 20, stickHeight, {
    frictionAir: 0.05 ,
    render: {
      fillStyle: color,
      strokeStyle: 'black',
      lineWidth: 1
 }
  });

  var constraint = Constraint.create({
    pointA: { x: pos.x, y: box.position.y + stickHeight/2},
    bodyB: box,
    pointB: { x: 0, y: stickHeight/2 },
    stiffness: 1,
});

  // add all of the bodies to the world
  Composite.add(engine.world, [box, constraint]);

  return {box, constraint, lastPosition: {x: 0, y: 0}, alive: true, color, posBuffer: [pos]};
}
