import React, { useEffect, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { MathJax } from 'better-react-mathjax';
import { Engine, World, Bodies, Body } from 'matter-js';

function Box({
  item,
  engine,
  handleIncorrectMatch,
  boxesRef,
  removeBox,
  handleMatch,
}) {
  const ref = useRef(null);
  const bodyRef = useRef(null);

  const [{ isDragging }, dragRef] = useDrag({
    type: 'BOX',
    item: { id: item.id, type: item.type, pairId: item.pairId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, dropRef] = useDrop({
    accept: 'BOX',
    drop: (draggedItem) => {
      if (
        draggedItem.pairId === item.pairId &&
        draggedItem.id !== item.id &&
        draggedItem.type !== item.type
      ) {
        // Correct match
        const boxA = boxesRef.current.find((b) => b.item.id === draggedItem.id);
        const boxB = boxesRef.current.find((b) => b.item.id === item.id);

        if (boxA && boxB) {
          removeBox(boxA.item.id);
          removeBox(boxB.item.id);
          World.remove(engine.world, [boxA.body, boxB.body]);
          handleMatch();
        }
      } else {
        // Incorrect match
        const draggedBox = boxesRef.current.find((b) => b.item.id === draggedItem.id);
        if (draggedBox) {
          handleIncorrectMatch(draggedBox);
        }
      }
    },
  });

  const combinedRef = (node) => {
    dragRef(node);
    dropRef(node);
    ref.current = node;
  };

  // Create the physics body after the component mounts and the content is rendered
  useEffect(() => {
    if (ref.current && engine) {
      const { width, height } = ref.current.getBoundingClientRect();

      // Generate a random position or use a specific one
      const x = Math.random() * (800 - width) + width / 2;
      const y = Math.random() * (600 - height) + height / 2;

      // Position the DOM element
      ref.current.style.left = `${x - width / 2}px`;
      ref.current.style.top = `${y - height / 2}px`;

      // Create the physics body with the measured dimensions
      const body = Bodies.rectangle(x, y, width, height, {
        label: item.id,
        restitution: 0.8,
        friction: 0.1,
        frictionAir: 0.02,
        inertia: Infinity, // Prevent rotation
      });

      bodyRef.current = body;

      // Add the body to the world
      World.add(engine.world, body);

      // Add to boxesRef
      boxesRef.current.push({ item, body });

      return () => {
        // Remove the body from the world when the component unmounts
        World.remove(engine.world, body);
        // Remove from boxesRef
        boxesRef.current = boxesRef.current.filter((b) => b.body !== body);
      };
    }
  }, [engine]);

  // Update the position of the DOM element based on the physics body
  useEffect(() => {
    const update = () => {
      if (bodyRef.current && ref.current) {
        const { x, y } = bodyRef.current.position;
        ref.current.style.left = `${x - ref.current.offsetWidth / 2}px`;
        ref.current.style.top = `${y - ref.current.offsetHeight / 2}px`;
      }
      requestAnimationFrame(update);
    };
    update();
  }, []);

  return (
    <div
      ref={combinedRef}
      className="box"
      style={{
        position: 'absolute',
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
      }}
    >
      <MathJax>
        <div dangerouslySetInnerHTML={{ __html: item.content }} />
      </MathJax>
    </div>
  );
}

export default Box;

