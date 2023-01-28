import * as Matter from "matter-js";

export function matterSetup(root) {
  // module aliases
  var Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Constraint = Matter.Constraint,
    Composite = Matter.Composite;

  // create an engine
  var engine = Engine.create();

  // create a renderer
  var render = Render.create({
    element: root,
    engine: engine,
    options: {
      width: 1920,
      height: 1080,
      wireframes: false,
    },
  });

  // create two boxes and a ground
  let stickHeight = 300;
  var boxA = Bodies.rectangle(400, 200, 20, stickHeight, {
    frictionAir: 0.05 ,
    render: {
      fillStyle: 'red',
      strokeStyle: 'blue',
      lineWidth: 3
 }
  });

  var constraint = Constraint.create({
    pointA: { x: 400, y: boxA.position.y + stickHeight/2},
    bodyB: boxA,
    pointB: { x: 0, y: stickHeight/2 },
    stiffness: 1,
});

  // add all of the bodies to the world
  Composite.add(engine.world, [boxA, constraint]);

  // run the renderer
  Render.run(render);

  // create runner
  var runner = Runner.create();

  // run the engine
  Runner.run(runner, engine);

  document.querySelectorAll('canvas')[1].style = "position: absolute; top: 0px; left: 0px; width:100%";

  return {constraint, boxA};
}
