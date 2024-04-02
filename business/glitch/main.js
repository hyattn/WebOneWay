import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Pathfinding, PathfindingHelper } from 'three-pathfinding';

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

// CAMERA (AR Mode)
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// AGENT (Camera)
const agentHeight = 1.0;
const agentRadius = 0.25;
const agentGroup = new THREE.Group();
agentGroup.position.set(0, agentHeight / 2, 0);
scene.add(agentGroup);

// INITIALIZE THREE-PATHFINDING
const pathfinding = new Pathfinding();
const pathfindinghelper = new PathfindingHelper();
const ZONE = 'level1';
let navmesh;
let targetPosition = new THREE.Vector3();

// LOAD LEVEL and NAVMESH GLTF FILE
async function loadModels() {
    const loader = new GLTFLoader();
    const roomGltf = await new Promise((resolve, reject) => {
        loader.load('./public/gltf/SimpleRoom.gltf', resolve, undefined, reject);
    });
    scene.add(roomGltf.scene);

    const navmeshGltf = await new Promise((resolve, reject) => {
        loader.load('./public/gltf/NavMeshSimple.gltf', resolve, undefined, reject);
    });
    navmeshGltf.scene.traverse((node) => {
        if (node.isMesh && node.geometry instanceof THREE.BufferGeometry) {
            navmesh = node;
            pathfinding.setZoneData(ZONE, Pathfinding.createZone(navmesh.geometry));
            initializePathfinding(); // Initialize pathfinding after navmesh is loaded
            updatePath(camera.position, targetPosition, navmesh); // Update path when navmesh is loaded
        }
    });
}

// Function to initialize pathfinding after navmesh is loaded
function initializePathfinding() {
    // Event listener for dropdown change
    document.getElementById('targetDropdown').addEventListener('change', function(event) {
        const selectedValue = event.target.value;
        switch(selectedValue) {
            case 'Kitchen':
                targetPosition.set(-0.5, 0.2, 3.7);
                break;
            case 'LivingRoom':
                targetPosition.set(9.6, 0.2, 0.28);
                break;
            case 'WalkWay':
                targetPosition.set(-9.4, 0.2, 0.2);
                break;
            default:
                targetPosition.set(0, 0, 0);
        }
        updatePath(camera.position, targetPosition, navmesh); // Update path when target position changes
    });
}

// Function to update path visualization
function updatePath(start, end, navmesh) {
    if (!navmesh) {
        console.error('Navmesh geometry is not loaded.');
        return;
    }

    const groupID = pathfinding.getGroup(ZONE, start);
    const closestStart = pathfinding.getClosestNode(start, ZONE, groupID);
    const closestEnd = pathfinding.getClosestNode(end, ZONE, groupID);

    // Perform pathfinding using the navmesh geometry
    const navpath = pathfinding.findPath(closestStart.centroid, closestEnd.centroid, ZONE, groupID);

    if (navpath) {
        pathfindinghelper.reset();
        pathfindinghelper.setPlayerPosition(start);
        pathfindinghelper.setTargetPosition(end);
        pathfindinghelper.setPath(navpath);
    }
}

// Function to move the agent (camera) and update path
function moveAgentAndPath() {
    // Move agent (camera) to fixed destination
    camera.position.copy(targetPosition);
    camera.lookAt(0, 0, 0);

    // Update path with agent's new position
    updatePath(camera.position, targetPosition, navmesh);
}

// Initiate AR Button and XR Session

async function initAR() {
    const supported = await navigator.xr.isSessionSupported('immersive-ar');
    if (supported) {
        try {
            const session = await navigator.xr.requestSession('immersive-ar');
            renderer.xr.setSession(session);
            let referenceSpace;
            try {
                // Try to request local-floor reference space
                referenceSpace = await session.requestReferenceSpace('local-floor');
            } catch {
                // If local-floor is not supported, try requesting local
                referenceSpace = await session.requestReferenceSpace('local');
            }
            session.requestAnimationFrame((timestamp, frame) => {
                renderer.render(scene, camera);
                moveAgentAndPath(); // Move agent and update path initially
            });
        } catch (error) {
            console.error('Failed to start XR session:', error.message);
            // Handle the error gracefully, e.g., fallback to non-AR mode
        }
    } else {
        console.error('Immersive AR is not supported.');
        // Handle the case where immersive AR is not supported, e.g., fallback to non-AR mode
    }
}


// Load models and initialize AR
loadModels().then(initAR).catch((error) => {
    console.error('Error loading models:', error);
});

// Event listener for window resize event
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);
