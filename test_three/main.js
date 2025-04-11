// Import core THREE.js and addons
import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';

// Utility function: clamp a value between min and max
function clamp(min, x, max) {
    return Math.max(min, Math.min(x, max));
}



// Constants
const MAX_SPEED = 0.1;
let textMesh = null;
let firstSphere = null;

// Create custom Sphere class with movement logic
class Sphere extends THREE.Mesh {
    constructor(size, material) {
        const geometry = new THREE.SphereGeometry(size, 32, 16);
        super(geometry, material);
        this.size = size;
        this.speed_x = 0;
        this.speed_y = 0;
    }

    addSpeed(dx, dy) {
        this.speed_x += dx;
        this.speed_y += dy;
    }

    updatePosition() {
        this.speed_x = clamp(-MAX_SPEED, this.speed_x, MAX_SPEED);
        this.speed_y = clamp(-MAX_SPEED, this.speed_y, MAX_SPEED);
        this.position.x += this.speed_x;
        this.position.y += this.speed_y;
        this.speed_x *= 0.95;
        this.speed_y *= 0.95;
    }
}

// Setup renderer, scene, and camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const deplacementCamera = -1.4
camera.position.set(deplacementCamera, 0);
camera.lookAt(new THREE.Vector3(deplacementCamera, 0, 0));
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Materials
const materialText = new THREE.MeshPhongMaterial({ color: 0xEEEEEE });
const materialDark = new THREE.MeshPhongMaterial({ color: 0x383838 });
const materialGlass = new THREE.MeshPhysicalMaterial({ transmission: 1, roughness: 0.5 });
const palette = [0x003F5C, 0x58508D, 0xBC5090, 0xFF6361, 0xFFA600];
const materials = palette.map(color => new THREE.MeshPhongMaterial({ color }));

// Create background and glass plane
const background = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), materialDark);
background.position.z = -1;
background.receiveShadow = true;
scene.add(background);

const glass = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), materialGlass);
glass.position.set(-8.5, 0, 4);
scene.add(glass);

// Lights
const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.4);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.8);
directionalLight.position.set(0.6, 1, 4);

// Create a map representing the shadows
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.1;
directionalLight.shadow.camera.far = 100;
directionalLight.shadow.camera.fov = 50;
directionalLight.castShadow = true;

scene.add(directionalLight);



const spotLight = new THREE.SpotLight( 0xffffff );
spotLight.intensity = 100;
console.log(spotLight)
spotLight.position.set( 0, 0, 10 );

// Can use a custom spotlight form.
const url = 'gobo/square.png';
//const url = 'gobo/sci-fi.jpg';
//spotLight.map = new THREE.TextureLoader().load( url );

spotLight.castShadow = false;

spotLight.shadow.mapSize.width = 1024;
spotLight.shadow.mapSize.height = 1024;

spotLight.shadow.camera.near = 0.1;
spotLight.shadow.camera.far = 100;
spotLight.shadow.camera.fov = 30;

scene.add( spotLight );

// Generate and scale sphere sizes
let sizes = [
    50, 4, 5.2, 17.4, 5, 1.4, 4.3, 0.5, 1.6, 0.8, 0.04, 0.03,
    0.6, 0.2, 0.8,.2, 17.4, 5, 1.4, 4.3, 0.5, 1.6, 0.8, 0.04, 0.03,
    0.6, 0.2, 0.8,.2, 17.4, 5, 1.4, 4.3, 0.5, 1.6, 0.8, 0.04, 0.03,
    0.6, 0.2, 0.8, 0.5, 0.4, 0.6, 1.6, 0.8, 0.04, 0.03, 0.6,
    0.2, 0.8, 0.5, 0.4, 0.6, 1.6, 0.8, 0.04, 0.03, 0.6,
    0.2, 0.8, 0.5, 0.4, 0.6,
];
sizes = sizes.map(s => Math.pow(s, 1 / 3) * 0.5);

// Create spheres
const spheres = sizes.map(size => {
    const matIndex = Math.floor(Math.random() * materials.length);
    const sphere = new Sphere(size, materials[matIndex]);
    sphere.castShadow = true;
    return sphere;
});

//Prepare first Sphere
firstSphere = spheres[0];
firstSphere.position.set(0, 0, sizes[0]);
scene.add(firstSphere);

// Arrange spheres around the first one in a circle
let angle = 0.2;// Not 0 to break symmetry
for (let i = 0; i < spheres.length; i++) {
    const r = sizes[0] + sizes[i];
    spheres[i].position.set(30/r * Math.cos(angle), 30/r * Math.sin(angle), sizes[i]);
    scene.add(spheres[i]);
    angle += (2 * Math.PI) / spheres.length;
}

// Load font and create 3D text mesh
const fontLoader = new FontLoader();
fontLoader.load('fonts/helvetiker_regular.typeface.json', font => {


    const fontParam = {
        font: font,
            size: 0.1,
        depth: 0.02,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.002,
        bevelSize: 0.001,
        bevelOffset: 0,
        bevelSegments: 2
    }

    const fontParam2 = {
        font: font,
        size: 3,
        depth: 0.0002,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.002,
        bevelSize: 0.001,
        bevelOffset: 0,
        bevelSegments: 2
    }

    const textGeo = new TextGeometry('On The Rock', fontParam);
    const year = new TextGeometry('2020', fontParam2);


    const yearMesh = new THREE.Mesh(year, materialText);
    const box = new THREE.Box3().setFromObject(yearMesh);
    const size_text = new THREE.Vector3();
    box.getSize(size_text);
    yearMesh.position.set(-size_text.x/2, -size_text.y/2, 0);
    yearMesh.receiveShadow = true;
    //yearMesh.position.set(0, 0, 0);
    textMesh = new THREE.Mesh(textGeo, materialText);
    scene.add(textMesh);
    scene.add(yearMesh);
});

// Camera position
camera.position.z = 10;

function textPosition() {
    // Update text position to follow the first sphere
    if (textMesh && firstSphere) {


        const box = new THREE.Box3().setFromObject(textMesh);
        const size_text = new THREE.Vector3();
        box.getSize(size_text);


        const r = firstSphere.size;
        textMesh.position.x = firstSphere.position.x - size_text.x / 2;
        textMesh.position.y = firstSphere.position.y;
        textMesh.position.z = 2*r;

    }
}

// Physics interaction logic
function applyForces(spheres) {
    const gravity = 0.0008;

    for (let i = 0; i < spheres.length; i++) {
        const a = spheres[i];
        a.addSpeed(-a.position.x * gravity, -a.position.y * gravity);

        for (let j = i + 1; j < spheres.length; j++) {
            const b = spheres[j];

            const dx = b.position.x - a.position.x;
            const dy = b.position.y - a.position.y;
            const dz = b.position.z - a.position.z;
            const distance = Math.sqrt(dx ** 2 + dy ** 2 + dz**2) - a.size - b.size;

            if (distance > 0.2) continue;

            const angle = Math.atan2(dy, dx);
            const force = Math.exp(-distance) * 0.005;

            const fx = Math.cos(angle) * force;
            const fy = Math.sin(angle) * force;

            const massA = Math.pow(a.size, 3);
            const massB = Math.pow(b.size, 3);

            a.addSpeed(-fx / massA, -fy / massA);
            b.addSpeed(fx / massB, fy / massB);
        }
    }

    for (let i = 0; i < spheres.length; i++) {
        spheres[i].updatePosition();
    }
}

// Main animation loop
function animate() {
    requestAnimationFrame(animate);
    applyForces(spheres);

    textPosition();

    renderer.render(scene, camera);
}

animate();