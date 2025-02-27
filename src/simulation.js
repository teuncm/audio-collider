import { mouseConstraint, engine, render, baseBackgroundColor, world, width, height } from './init-scene.js';
import { isToneStarted, ensureTone, triggerBell, triggerSaw, constructFrequencies } from './audio.js';

import _ from 'lodash';
import chroma from "chroma-js";

import Matter from "matter-js";
const { Bodies, World, Mouse, MouseConstraint, Events, Vector, Body } = Matter;

const bodies = [];

const bodyDensity = 0.000036;
const maxForce = 0.04;
const explosionStrength = 3;

const totalArea = width * height;
const defaultBodyColor = "rgb(80, 80, 80)";

let curHue = 0;

// Generate bodies based on screen estate
const numBodies = Math.floor(totalArea * bodyDensity);
for (let i = 0; i < numBodies; i++) {
  const circle = Bodies.polygon(
    Math.random() * (width - 100) + 50,
    Math.random() * (height - 100) + 50,
    3,
    Math.random() * 10 + 20,
    {
      angle: Math.random() * 2 * Math.PI, label: `${i}`, restitution: 0.99, friction: 0, frictionAir: 0.001, render: {
        fillStyle: defaultBodyColor, strokeStyle: "white", lineWidth: 1
      }
    },
  );
  bodies.push(circle);
}
World.add(world, bodies);

// Handle mouse click
Events.on(mouseConstraint, "mousedown", async function (event) {
  await ensureTone();

  const transpose = _.random(0, 11);
  constructFrequencies(transpose);

  triggerSaw();

  curHue = _.random(0, 360, true);

  render.options.background = chroma(baseBackgroundColor).set('hsl.h', curHue);

  const mousePosition = mouseConstraint.mouse.position;
  const { x, y } = mousePosition;

  const explosionColor = chroma(baseBackgroundColor).set('hsl.h', curHue).saturate(256).darken(1.2);

  createExplosion(x, y, explosionColor, 5, 0.7, 1.5, -0.05, 30);
  createExplosion(x, y, explosionColor, 5, 0.7, 2, -0.07, 30);
  createExplosion(x, y, explosionColor, 5, 0.7, 3, -0.09, 30);
  applyOutwardForce(mousePosition);
});

// Wrap-around logic
Events.on(engine, "beforeUpdate", function () {
  bodies.forEach(body => {
    const { position } = body;

    // Check horizontal bounds
    if (position.x < 0) {
      Body.setPosition(body, { x: width, y: position.y });
    } else if (position.x > width) {
      Body.setPosition(body, { x: 0, y: position.y });
    }

    // Check vertical bounds
    if (position.y < 0) {
      Body.setPosition(body, { x: position.x, y: height });
    } else if (position.y > height) {
      Body.setPosition(body, { x: position.x, y: 0 });
    }
  });
});

// Listen for body collisions
Events.on(engine, "collisionStart", function (event) {
  event.pairs.forEach(pair => {
    const { bodyA, bodyB } = pair;

    // Only affect objects
    if (bodies.includes(bodyA) && bodies.includes(bodyB) && isToneStarted) {
      triggerBell();

      const glowColor = chroma(baseBackgroundColor).set('hsl.h', curHue).saturate(256).brighten(1.5);

      triggerGlow(bodyA, defaultBodyColor, glowColor);
      triggerGlow(bodyB, defaultBodyColor, glowColor);

      const midX = (bodyA.position.x + bodyB.position.x) / 2;
      const midY = (bodyA.position.y + bodyB.position.y) / 2;

      createExplosion(midX, midY, glowColor, 30, 0.5);
    }
  });
});

// Create explosion effect
function createExplosion(x, y, color, initScale, initAlpha, scaleIncrease = 0.1, alphaIncrease = -0.1, interval = 70) {
  // Add to world
  const explosionCircle = Bodies.circle(x, y, initScale, {
    isSensor: true,
    isStatic: true,
    render: {
      fillStyle: chroma(color).alpha(initAlpha).css(),
    }
  });
  World.add(world, explosionCircle);

  // Animate explosion and fade out
  let scaleFactor = 1;
  let alphaFactor = 1;
  const explosionInterval = setInterval(() => {
    scaleFactor += scaleIncrease;
    alphaFactor += alphaIncrease;

    if (alphaFactor <= 0) {
      clearInterval(explosionInterval);
      World.remove(world, explosionCircle);

      return;
    }

    explosionCircle.circleRadius = scaleFactor * initScale;
    explosionCircle.render.fillStyle = chroma(color).alpha(alphaFactor * initAlpha).css();
  }, interval);
}

// Make object glow
function triggerGlow(matterObj, originalColor, glowColor, glowDuration = 200) {
  matterObj.render.fillStyle = glowColor;
  matterObj.render.lineWidth = 2;

  // Revert back to original after a short delay
  setTimeout(() => {
    matterObj.render.fillStyle = originalColor;
    matterObj.render.lineWidth = 1;
  }, glowDuration);
}

// Apply outward force from mouse position on all bodies
function applyOutwardForce(mousePosition) {
  bodies.forEach(body => {
    const direction = Vector.sub(body.position, mousePosition);
    // Prevent division by zero
    const distance = Vector.magnitude(direction) || 0.001;
    let magnitude = explosionStrength / distance;
    magnitude = Math.min(magnitude, maxForce);

    const force = Vector.mult(Vector.normalise(direction), magnitude);
    Body.applyForce(body, body.position, force);
  });
}
