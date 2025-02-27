import Matter from "matter-js";

const { Engine, Render, Runner, World, Mouse, MouseConstraint } = Matter;

export const engine = Engine.create();
export const { world } = engine;

// Disable gravity
engine.gravity.y = 0;
engine.gravity.x = 0;

const appDiv = document.getElementById("app");

export const baseBackgroundColor = "rgb(20, 0, 0)";

// Create renderer
export const width = window.innerWidth;
export const height = window.innerHeight;
export const render = Render.create({
  element: appDiv,
  engine: engine,
  options: {
    width,
    height,
    wireframes: false,
    // showVelocity: true,
    // showCollisions: true,
    // showAngleIndicator: true,
    // showAxes: true,
    background: baseBackgroundColor,
  }
});
Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// Add mouse interaction
const mouse = Mouse.create(render.canvas);
export const mouseConstraint = MouseConstraint.create(engine, {
  mouse: mouse,
  constraint: { stiffness: 0, render: false }
});
World.add(world, mouseConstraint);
