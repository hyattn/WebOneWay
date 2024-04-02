import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DeviceOrientationControls } from 'three/examples/jsm/controls/DeviceOrientationControls.js';

let scene, camera, renderer;
let navigationArea;
let kitchenTarget, livingRoomTarget;

let controls;

init();

async function init() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    ambient.position.set(0.5, 1, 0.25);
    scene.add(ambient);

    // Load GLTF models for navigation area and navmesh
    const loader = new GLTFLoader();
    loader.load("/textures/bricks/SimpleRoom.gltf", function (gltf) {
        navigationArea = gltf.scene;
        scene.add(navigationArea);
    });

    // Load navmesh GLTF model
    loader.load("/textures/bricks/NavMeshSimple.gltf", function (gltf) {
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

    // Initialize buttons for kitchen and living room
    kitchenTarget = document.getElementById("kitchenTarget");
    livingRoomTarget = document.getElementById("livingRoomTarget");

    // Add event listeners to buttons
    kitchenTarget.addEventListener("click", () => {
        startNavigation(new THREE.Vector3(-2.8, 0, 2));
    });

    livingRoomTarget.addEventListener("click", () => {
        startNavigation(new THREE.Vector3(0.7, 0, 2.5));
    });

    // Initialize DeviceOrientationControls
    controls = new DeviceOrientationControls(camera);
}

function startNavigation(targetPosition) {
    if (!navigationArea) return;

    // Set the navigation area's position to the target position
    navigationArea.position.copy(targetPosition);
    // Make navigation area visible
    navigationArea.visible = true;

    // Reset camera position and rotation
    camera.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);

    // Event listener for device orientation change
    window.addEventListener('deviceorientation', onDeviceOrientationChange, false);
}

function onDeviceOrientationChange(event) {
    if (!navigationArea) return;

    // Calculate rotation change
    const alpha = event.alpha;
    const beta = event.beta;
    const gamma = event.gamma;

    // Adjust navigation based on rotation change
    const movementSpeed = 0.01;
    const rotationSpeed = 0.02;

    // Move navigation area based on device orientation
    navigationArea.position.x -= gamma * movementSpeed;
    navigationArea.position.z -= beta * movementSpeed;

    // Rotate navigation area based on device orientation
    navigationArea.rotation.y -= alpha * rotationSpeed;

    // Render scene
    renderer.render(scene, camera);
}

function animate() {
    requestAnimationFrame(animate);

    if (controls) {
        controls.update();
    }

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
