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
scene.add(pathfindinghelper);
const ZONE = 'level1';
let navmesh;
let targetPosition;

// LOAD LEVEL
const loader = new GLTFLoader();
loader.load('./public/gltf//SimpleRoom.gltf', function (gltf) {
    scene.add(gltf.scene);
});

// LOAD NAVMESH GLTF FILE
loader.load('./public/gltf/NavMeshSimple.gltf', function (gltf) {
    gltf.scene.traverse((node) => {
        if (node.isMesh && node.geometry instanceof THREE.BufferGeometry) {
            navmesh = node;
            console.log(navmesh); // ①
            pathfinding.setZoneData(ZONE, Pathfinding.createZone(navmesh.geometry));
            
            // Now that navmesh is defined, you can call any function dependent on it
            // For example, you can call a function to initialize pathfinding:
            initializePathfinding();
          
            console.log(targetPosition);
            updatePath(camera.position,targetPosition);
        }
    });
});


// Function to initialize pathfinding after navmesh is loaded
function initializePathfinding() {
    pathfinding = new Pathfinding();
    pathfindinghelper = new PathfindingHelper();
    scene.add(pathfindinghelper);
    const ZONE = 'level1';
    const SPEED = 5;
    pathfinding.setZoneData(ZONE, Pathfinding.createZone(navmesh.geometry));

    // Event listener for dropdown change
    document.getElementById('targetDropdown').addEventListener('change', function(event) {
        const selectedValue = event.target.value;
        

        // Set target position based on the selected option
        switch(selectedValue) {
            case 'Kitchen':
                targetPosition = new THREE.Vector3(-0.5, 0.2, 3.7);
                break;
            case 'LivingRoom':
                targetPosition = new THREE.Vector3(9.6, 0.2, 0.28);
                break;
            case 'WalkWay':
                targetPosition = new THREE.Vector3(-9.4, 0.2, 0.2);
                break;
            default:
                targetPosition = new THREE.Vector3(0, 0, 0);
        }
      
      return targetPosition;
    });
}


// Fixed Destination Point
const fixedDestination = new THREE.Vector3(2, 0, 3);

// Function to update path visualization
function updatePath(start, end) {
    const groupID = pathfinding.getGroup(ZONE, start);
    if (!navmesh) {
        console.error('Navmesh geometry is not loaded.');
        return;
    }

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
    camera.position.copy(fixedDestination);
    camera.lookAt(0, 0, 0);

    // Update path with agent's new position
    updatePath(camera.position, fixedDestination);
}

// Initiate AR Button
document.body.appendChild(ARButton.createButton(renderer));

// Initiate XR Session
function initXR() {
    navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
        if (supported) {
            navigator.xr.requestSession('immersive-ar').then(onSessionStarted);
        }
    });
}

// Function to start XR session
function onSessionStarted(session) {
    renderer.xr.setSession(session);
    session.requestReferenceSpace('local').then((referenceSpace) => {
        session.requestAnimationFrame((timestamp, frame) => {
            renderer.render(scene, camera);
            moveAgentAndPath(); // Move agent and update path initially
        });
    }).catch((error) => {
        console.error('Failed to start XR session:', error.message);
        // Handle the error gracefully, e.g., fallback to non-AR mode
    });
}

initXR();

// Event listener for window resize event
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);
