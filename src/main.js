import './style.css'

import Matter from "matter-js";
import * as Tone from "tone";
import _ from 'lodash'

// Import Matter.js
const { Engine, Render, Runner, Bodies, World, Mouse, MouseConstraint, Events, Vector, Body } = Matter;

// Create engine and world
const engine = Engine.create();
const { world } = engine;

// Disable gravity
engine.gravity.y = 0;
engine.gravity.x = 0;

// Select the app div
const app = document.getElementById("app");

// Create renderer
const width = window.innerWidth;
const height = window.innerHeight;
const render = Render.create({
    element: app,
    engine: engine,
    options: {
        width,
        height,
        wireframes: false,
        // showVelocity: true,
        showCollisions: true,
        // showAngleIndicator: true,
        // showAxes: true,
        background: "black",
    }
});

Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// // Custom rendering loop to draw numbers
// Events.on(render, "afterRender", () => {
//     const context = render.context;

//     // Draw numbers on each ball
//     bodies.forEach(body => {
//         context.fillStyle = "white"; // Text color
//         context.font = "16px Arial"; // Font style
//         context.textAlign = "center";
//         context.textBaseline = "middle";

//         // Draw number at the ball's position
//         context.fillText(body.label, body.position.x, body.position.y);
//     });
// });

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

const bodyDensity = 0.000040;
const totalArea = width * height;

// Generate numBodies circular bodies
const numBodies = Math.floor(totalArea * bodyDensity);
const bodies = [];
for (let i = 0; i < numBodies; i++) {
    const circle = Bodies.polygon(
        Math.random() * (width - 100) + 50,
        Math.random() * (height - 100) + 50,
        3,
        22,
        { angle: Math.random() * 2 * Math.PI, label: `${i}`, restitution: 0.999, friction: 0, frictionAir: 0.001, render: { fillStyle: "rgb(80, 80, 80)", strokeStyle: "white", lineWidth: 1 } },
    );
    bodies.push(circle);
}
World.add(world, bodies);

// Enable mouse interaction with MouseConstraint
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: { stiffness: 0, render: false } // Disable dragging effect
});
World.add(world, mouseConstraint);

// Flag to check if Tone.js is started
let isToneStarted = false;

// Function to start Tone.js once
const ensureTone = async () => {
    if (!isToneStarted) {
        await Tone.start(); // Start Audio Context
        isToneStarted = true;
        console.log("Audio context started!");
    }
};

function createClickIndicator(x, y) {
    const indicator = Bodies.circle(x, y, 5, {
        isSensor: true,
        isStatic: true,
        render: {
            fillStyle: "rgba(255, 100, 100, 0.7)"
        }
    });

    World.add(world, indicator);

    let scale = 5;
    let opacity = 0.7;

    const expandInterval = setInterval(() => {
        scale += 4;
        opacity -= 0.1;

        indicator.circleRadius = 5 * scale;
        indicator.render.fillStyle = `rgba(255, 100, 100, ${opacity})`;

        if (opacity <= 0) {
            clearInterval(expandInterval);
            World.remove(world, indicator);
        }
    }, 30);
}

// Explosion effect on mouse click with force cap
const maxForce = 0.04; // Maximum force cap
const explosionStrength = 3; // Adjust this for stronger/weaker explosions

Events.on(mouseConstraint, "mousedown", function (event) {
    ensureTone();

    const transpose = _.random(0, 11);
    frequencies = constructFrequencies(transpose);

    const mousePosition = mouseConstraint.mouse.position;

    createClickIndicator(mousePosition.x, mousePosition.y);

    bodies.forEach(body => {
        const direction = Vector.sub(body.position, mousePosition);
        const distance = Vector.magnitude(direction) || 0.001; // Prevent division by zero
        let magnitude = explosionStrength / distance;
        magnitude = Math.min(magnitude, maxForce); // Apply force cap

        const force = Vector.mult(Vector.normalise(direction), magnitude);
        Body.applyForce(body, body.position, force);
    });
});

const limiter = new Tone.Limiter(-1).toDestination();
const highShelf = new Tone.Filter({
    type: "highshelf",
    frequency: 2400,
    gain: -24
}).connect(limiter);
const chorus = new Tone.Chorus(5, 2.5, 0.3).connect(highShelf);
const pingPongDelay = new Tone.PingPongDelay({
    delayTime: "0.25s",
    feedback: 0.27,
    wet: 0.11
}).connect(chorus);
const masterGain = new Tone.Volume(-12).connect(pingPongDelay);

// const notes = ["E", "F#", "G#", "B", "D#"]
// const octaves = [3, 4, 5, 6, 7, 8]

const freqObj = Tone.Frequency("C2")
const scaleIdxs = [0, 2, 4, 7, 10]
const octIdxs = [0, 1, 2, 3, 4]
const scale = _.flatten(
    _.map(octIdxs, (o) =>
        _.map(scaleIdxs, (s) =>
            o * 12 + s
        )
    )
)

const constructFrequencies = (transpose = 0) => {
    const frequencies = freqObj.transpose(transpose).harmonize(scale);
    
    return frequencies;
}

let frequencies = constructFrequencies();

const polySynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: {
        attack: 0.01,
        decay: 0.5,
        sustain: 0,
        release: 1,
    },
    maxPolyphony: 12
}).connect(masterGain);

const triggerBell = () => {
    const frequency = _.sample(frequencies)

    if (isToneStarted) {
        const now = Tone.now();
        polySynth.triggerAttackRelease(frequency, "0.15s", now + 0.05);
    }
}

// Custom glowing effect duration (in ms)
const glowDuration = 200;

// Listen for ball collisions
Events.on(engine, "collisionStart", (event) => {
    event.pairs.forEach(pair => {
        triggerBell();

        const { bodyA, bodyB } = pair;

        // Only affect balls
        if (bodies.includes(bodyA) && bodies.includes(bodyB) && isToneStarted) {
            // Make both balls glow
            makeBallGlow(bodyA);
            makeBallGlow(bodyB);

            createBloom((bodyA.position.x + bodyB.position.x) / 2,
                (bodyA.position.y + bodyB.position.y) / 2);
        }
    });
});

// ✨ Function to Create a Bloom Effect Inside Matter.js Canvas
function createBloom(x, y) {
    const bloom = Bodies.circle(x, y, 30, {
        isSensor: true,
        isStatic: true,
        render: {
            fillStyle: "rgba(255, 255, 100, 0.5)"
        }
    });

    World.add(world, bloom);

    // Animate bloom expansion and fade-out
    let scale = 1;
    let opacity = 0.5;
    const bloomInterval = setInterval(() => {
        scale += 0.18;
        opacity -= 0.05;

        bloom.circleRadius = 30 * scale;
        bloom.render.fillStyle = `rgba(255, 255, 0, ${opacity})`;

        if (opacity <= 0) {
            clearInterval(bloomInterval);
            World.remove(world, bloom);
        }
    }, 70);
}

// Function to make a ball glow
function makeBallGlow(ball) {
    // Change the render fill color to glowing yellow
    ball.render.fillStyle = "rgb(255, 255, 0)";

    // Revert back to original after a short delay
    setTimeout(() => {
        ball.render.fillStyle = "rgb(80, 80, 80)"; // Default color (change as needed)
    }, glowDuration);
}
