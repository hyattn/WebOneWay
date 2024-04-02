import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";

let scene, camera, renderer;
let navigationArea;

init();

async function init() {
    scene = new THREE.Scene();

    // Initialize AR scene
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Initialize AR camera
    camera = new THREE.Camera();
    scene.add(camera);

    // Load GLTF models for navigation area and navmesh
    const loader = new GLTFLoader();
    loader.load("/textures/bricks/SimpleRoom.gltf", function (gltf) {
        navigationArea = gltf.scene;
        scene.add(navigationArea);
    });

    // Load navmesh GLTF model
    loader.load("/textures/bricks/NavMeshSimple.gltf", function (gltf) {
        // Replace existing geometry with loaded GLTF object
        navigationArea.children.forEach(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                child.material.dispose();
                navigationArea.remove(child);
            }
        });
        const navmesh = gltf.scene;
        navigationArea.add(navmesh);
    });

    // Add AR button
    const button = ARButton.createButton(renderer, {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay', 'dom-overlay-for-handheld-ar']
    });
    document.body.appendChild(button);

    // Start rendering
    animate();
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render() {
    // Render the scene
    renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
    // Update camera aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    // Update renderer size
    renderer.setSize(window.innerWidth, window.innerHeight);
});
