import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Pathfinding, PathfindingHelper } from 'three-pathfinding';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';

// ARモードに移行する関数
function enterARMode() {
    // ボタンをクリックしてもページがリロードされないようにする
    event.preventDefault();
    // ARモードに移行する
    document.querySelector('a-scene').enterAR();
}

// ボタンを表示する関数
function showARButton() {
    // ボタンを表示する
    document.getElementById('arButton').style.display = 'block';
}

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

// CAMERA
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(33, 10, 10);

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.xr.enabled = true;

// ORBIT CAMERA CONTROLS
const orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
orbitControls.mouseButtons = {
    MIDDLE: THREE.MOUSE.ROTATE,
    RIGHT: THREE.MOUSE.PAN
};
orbitControls.enableDamping = true;
orbitControls.enablePan = true;
orbitControls.minDistance = 5;
orbitControls.maxDistance = 60;
orbitControls.maxPolarAngle = Math.PI / 2 - 0.05;
orbitControls.minPolarAngle = Math.PI / 4;

// LIGHTS
const dLight = new THREE.DirectionalLight('white', 0.8);
dLight.position.set(20, 30, 0);
dLight.castShadow = true;
dLight.shadow.mapSize.width = 4096;
dLight.shadow.mapSize.height = 4096;
const d = 35;
dLight.shadow.camera.left = -d;
dLight.shadow.camera.right = d;
dLight.shadow.camera.top = d;
dLight.shadow.camera.bottom = -d;
scene.add(dLight);

const aLight = new THREE.AmbientLight('white', 0.5);
scene.add(aLight);

// ATTACH RENDERER
document.body.appendChild(renderer.domElement);

// RESIZE HANDLER
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

// AR BUTTON
document.body.appendChild(ARButton.createButton(renderer));
// ボタンを表示する
showARButton();

// LOAD LEVEL
const loader = new GLTFLoader();
loader.load('./gltf/HospitalModelAddRooms.gltf', function (gltf) {
    // モデルを読み込んだ後に表示する
    const modelContainer = document.getElementById('modelContainer');
    modelContainer.appendChild(gltf.scene);
});

// INITIALIZE THREE-PATHFINDING
const pathfinding = new Pathfinding();
const pathfindinghelper = new PathfindingHelper();
scene.add(pathfindinghelper);
const ZONE = 'level1';
const SPEED = 5;
let navmesh;
let groupID;
let navpath;
loader.load('./gltf/HospitalModelAddRooms.NavMeshgltf.gltf', function (gltf) {
    scene.add(gltf.scene);
    gltf.scene.traverse((node) => {
        if (!navmesh && node.isObject3D && node.children && node.children.length > 0) {
            navmesh = node.children[0];
            pathfinding.setZoneData(ZONE, Pathfinding.createZone(navmesh.geometry));
        }
    });
});

// RAYCASTING
const raycaster = new THREE.Raycaster();
const clickMouse = new THREE.Vector2();

function intersect(pos) {
    raycaster.setFromCamera(pos, camera);
    return raycaster.intersectObjects(scene.children);
}
window.addEventListener('click', event => {
    clickMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    clickMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const found = intersect(clickMouse);
    if (found.length > 0) {
        let target = found[0].point;
        const agentpos = agentGroup.position;
        groupID = pathfinding.getGroup(ZONE, agentGroup.position);
        const closest = pathfinding.getClosestNode(agentpos, ZONE, groupID);
        navpath = pathfinding.findPath(closest.centroid, target, ZONE, groupID);
        if (navpath) {
            pathfindinghelper.reset();
            pathfindinghelper.setPlayerPosition(agentpos);
            pathfindinghelper.setTargetPosition(target);
            pathfindinghelper.setPath(navpath);
        }
    }
});

// MOVEMENT ALONG PATH
function move(delta) {
    if (!navpath || navpath.length <= 0) return;

    let targetPosition = navpath[0];
    const distance = targetPosition.clone().sub(agentGroup.position);

    if (distance.lengthSq() > 0.05 * 0.05) {
        distance.normalize();
        agentGroup.position.add(distance.multiplyScalar(delta * SPEED));
    } else {
        navpath.shift();
    }
}

// DEVICE ORIENTATION EVENT HANDLER
function onDeviceOrientation(event) {
    const { gamma, beta, alpha } = event;
    // Calculate camera movement based on device orientation
    const dx = gamma / 90;
    const dy = beta / 90;
    const dz = alpha / 90;
    // Update camera position
    const cameraPosition = new THREE.Vector3(
        camera.position.x + dx,
        camera.position.y + dy,
        camera.position.z + dz
    );
    camera.position.copy(cameraPosition);
}

// Start listening for device orientation changes
window.addEventListener('deviceorientation', onDeviceOrientation);

// GAME LOOP
const clock = new THREE.Clock();
function gameLoop() {
    const delta = clock.getDelta();
    move(delta);
    orbitControls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(gameLoop);
}
gameLoop();
