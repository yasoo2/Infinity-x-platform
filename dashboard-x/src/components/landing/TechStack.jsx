
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Float, OrbitControls, Text } from '@react-three/drei';
import { SiJavascript, SiTypescript, SiPython, SiReact, SiNodedotjs, SiNextdotjs, SiVuedotjs, SiGooglecloud, SiAmazon, SiDocker, SiKubernetes } from 'react-icons/si';

const techIcons = [
  { icon: SiJavascript, name: 'JavaScript', color: '#F7DF1E' },
  { icon: SiTypescript, name: 'TypeScript', color: '#3178C6' },
  { icon: SiPython, name: 'Python', color: '#3776AB' },
  { icon: SiReact, name: 'React', color: '#61DAFB' },
  { icon: SiNodedotjs, name: 'Node.js', color: '#339933' },
  { icon: SiNextdotjs, name: 'Next.js', color: '#000000' },
  { icon: SiVuedotjs, name: 'Vue.js', color: '#4FC08D' },
  { icon: SiGooglecloud, name: 'Google Cloud', color: '#4285F4' },
  { icon: SiAmazon, name: 'AWS', color: '#232F3E' },
  { icon: SiDocker, name: 'Docker', color: '#2496ED' },
  { icon: SiKubernetes, name: 'Kubernetes', color: '#326CE5' },
];

const IconCloud = () => {
  return (
    <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
      <Suspense fallback={null}>
        <ambientLight intensity={0.8} />
        <pointLight intensity={1} position={[10, 10, 10]} />
        {techIcons.map((tech, i) => (
          <Float key={i} speed={1.5} rotationIntensity={1} floatIntensity={2}>
            <mesh position={[(Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color={tech.color} emissive={tech.color} emissiveIntensity={0.5} roughness={0.5} />
              <Text position={[0, -0.7, 0]} fontSize={0.2} color="white" anchorX="center" anchorY="middle">
                {tech.name}
              </Text>
            </mesh>
          </Float>
        ))}
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
      </Suspense>
    </Canvas>
  );
};


const TechStack = () => {
  return (
    <section id="tech-stack" className="py-20 bg-gray-800/50 h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Powering Innovation with Modern Technology</h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-400">We use a battle-tested, modern tech stack to deliver reliable and scalable solutions.</p>
        </div>
        <IconCloud />
      </div>
    </section>
  );
};

export default TechStack;

