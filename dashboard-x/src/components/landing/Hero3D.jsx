
import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial } from '@react-three/drei';

const AnimatedSphere = () => {
  const ref = useRef();

  useFrame(({ clock }) => {
    ref.current.rotation.x = ref.current.rotation.y = ref.current.rotation.z = Math.sin(clock.getElapsedTime()) * 0.3;
  });

  return (
    <Sphere ref={ref} args={[1, 100, 200]} scale={1.2}>
      <MeshDistortMaterial
        color="#8A2BE2"
        attach="material"
        distort={0.5}
        speed={2}
        roughness={0.1}
      />
    </Sphere>
  );
};

const Hero3D = () => {
  return (
    <div className="absolute top-0 left-0 w-full h-full z-0">
      <Canvas>
        <Suspense fallback={null}>
          <OrbitControls enableZoom={false} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[3, 5, 2]} />
          <AnimatedSphere />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Hero3D;
