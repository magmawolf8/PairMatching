import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import { MathJaxContext } from 'better-react-mathjax';
import Box from './Box';
import { Engine, World, Bodies, Body, Events } from 'matter-js';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

function App() {
  const [data, setData] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [totalPairs, setTotalPairs] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [positions, setPositions] = useState({});

  const engineRef = useRef(Engine.create());
  const boxesRef = useRef([]);
  const boundariesRef = useRef([]);
  const requestIdRef = useRef();

  useEffect(() => {
    fetch('/api/problems')
      .then((res) => res.json())
      .then((data) => {
        const itemsWithId = data.flatMap((item, index) => [
          {
            id: `problem-${index}`,
            type: 'problem',
            content: item.problem,
            pairId: index.toString(),
          },
          {
            id: `solution-${index}`,
            type: 'solution',
            content: item.solution,
            pairId: index.toString(),
          },
        ]);
        setData(itemsWithId);
        setTotalPairs(data.length);
      });

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(requestIdRef.current);
      Engine.clear(engineRef.current);
    };
  }, []);

  useEffect(() => {
    let timer;
    if (gameStarted && !gameOver) {
      timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameStarted, gameOver, startTime]);

  const startGame = () => {
    setMatchedPairs(0);
    setGameOver(false);
    setGameStarted(true);
    setElapsedTime(0);
    setStartTime(Date.now());

    // Initialize physics engine and world
    const engine = engineRef.current;
    engine.world.gravity.y = 0; // Disable gravity
    engine.enableSleeping = false; // Ensure sleeping bodies are updated
    engine.constraintIterations = 4;
    engine.positionIterations = 6;
    engine.velocityIterations = 4;
    const world = engine.world;
    Engine.clear(engine);
    World.clear(world);
    boxesRef.current = [];
    boundariesRef.current = [];

    // Create boundaries
    const boundaries = [
      // Ground
      Bodies.rectangle(400, 610, 800, 20, { isStatic: true }),
      // Ceiling
      Bodies.rectangle(400, -10, 800, 20, { isStatic: true }),
      // Left wall
      Bodies.rectangle(-10, 300, 20, 600, { isStatic: true }),
      // Right wall
      Bodies.rectangle(810, 300, 20, 600, { isStatic: true }),
    ];
    World.add(world, boundaries);
    boundariesRef.current = boundaries;

    // Shuffle and position boxes without overlap
    const shuffledData = shuffleArray([...data]);
    const positions = generateNonOverlappingPositions(shuffledData.length);
    const boxes = [];

    shuffledData.forEach((item, index) => {
      const { x, y } = positions[index];
      item.position = { x, y }; // Initialize item.position here

      const boxBody = Bodies.rectangle(x, y, 150, 50, {
        label: item.id,
        restitution: 0.8,
        friction: 0,
        frictionAir: 0.0045,
        inertia: Infinity, // Prevent rotation
      });
      boxes.push({ item, body: boxBody });
    });

    boxesRef.current = boxes;
    World.add(world, boxes.map((b) => b.body));

    // Remove Runner (we'll update the engine manually)
    // const runner = Runner.create();
    // Runner.run(runner, engine);

    // Start the rendering loop
    requestIdRef.current = requestAnimationFrame(update);
  };

  const handleCollision = (event) => {
    // Optional: Remove if handling correct matches in Box.js
  };

  const handleMatch = () => {
    setMatchedPairs((prev) => {
      const newMatchedPairs = prev + 1;
      if (newMatchedPairs === totalPairs) {
        setGameOver(true);
        setGameStarted(false);
        cancelAnimationFrame(requestIdRef.current);
        Engine.clear(engineRef.current);
      }
      return newMatchedPairs;
    });
  };

  const removeBox = (id) => {
    setData((prevData) => prevData.filter((item) => item.id !== id));
    boxesRef.current = boxesRef.current.filter((box) => box.item.id !== id);
  };

const handleIncorrectMatch = (draggedBox) => {
  const forceMagnitude = 7.5;

  boxesRef.current.forEach((box) => {
    // Calculate the vector from the dragged box to the current box
    const dx = box.body.position.x - draggedBox.body.position.x;
    const dy = box.body.position.y - draggedBox.body.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1; // Prevent division by zero

    // Normalize the vector and apply the force magnitude
    const velocity = {
      x: (dx / distance) * forceMagnitude,
      y: (dy / distance) * forceMagnitude,
    };

    // Apply the velocity to the box
    Body.setVelocity(box.body, velocity);
  });
};
  const update = () => {
    Engine.update(engineRef.current, 1000 / 60); // Update at 60Hz

    const newPositions = {};
    boxesRef.current.forEach((box) => {
      const { x, y } = box.body.position;
      newPositions[box.item.id] = { x, y };
    });
    setPositions(newPositions); // Update positions state

    requestIdRef.current = requestAnimationFrame(update);
  };

  return (
    <MathJaxContext>
      <DndProvider backend={HTML5Backend}>
        <div className="App">
          <h1>Pair Matching Game</h1>
          {!gameStarted && <button onClick={startGame}>Start</button>}
          {gameStarted && <div id="timer">Time: {elapsedTime} seconds</div>}
          {gameOver && (
            <div id="endScreen">
              <h2>Congratulations!</h2>
              <p>Your time: {elapsedTime} seconds</p>
            </div>
          )}
          <div
            id="gameArea"
            style={{ position: 'relative', width: '800px', height: '600px' }}
          >
            {gameStarted &&
              boxesRef.current.map((box) => (
                <Box
                  key={box.item.id}
                  item={box.item}
                  body={box.body}
                  position={positions[box.item.id]} // Pass the position
                  engine={engineRef.current}
                  handleIncorrectMatch={handleIncorrectMatch}
                  boxesRef={boxesRef}
                  removeBox={removeBox}
                  handleMatch={handleMatch}
                />
              ))}
          </div>
        </div>
      </DndProvider>
    </MathJaxContext>
  );
}

export default App;

// Helper functions
function shuffleArray(array) {
  let currentIndex = array.length,
    randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

function generateNonOverlappingPositions(count) {
  const positions = [];
  const maxAttempts = 1000;
  const boxWidth = 160;
  const boxHeight = 60;
  const gameWidth = 800;
  const gameHeight = 600;

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let position;
    let overlapping;

    do {
      position = {
        x: Math.random() * (gameWidth - boxWidth) + boxWidth / 2,
        y: Math.random() * (gameHeight - boxHeight) + boxHeight / 2,
      };
      overlapping = positions.some((p) => {
        return (
          Math.abs(p.x - position.x) < boxWidth &&
          Math.abs(p.y - position.y) < boxHeight
        );
      });
      attempts++;
    } while (overlapping && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      console.warn('Could not find non-overlapping position for box', i);
    }

    positions.push(position);
  }

  return positions;
}

