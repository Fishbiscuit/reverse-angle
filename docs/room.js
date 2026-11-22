import * as THREE from './vendor/three.module.js';

const pose = {
  front: new THREE.Vector3(0,1.6,4.8),
  back: new THREE.Vector3(2.65,1.62,-3.65),
};
const look = {
  front: new THREE.Vector3(-.30,1.60,0),
  back: new THREE.Vector3(-.15,1.42,0),
};

function screenTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 512;
  const draw = canvas.getContext('2d');
  const gradient = draw.createRadialGradient(380,200,15,380,240,500);
  gradient.addColorStop(0,'#bdedb3');
  gradient.addColorStop(.49,'#629d79');
  gradient.addColorStop(1,'#265a4d');
  draw.fillStyle = gradient;
  draw.fillRect(0,0,768,512);
  for (let line=0; line<52; line++) {
    draw.beginPath();
    for (let x=0; x<769; x+=5) {
      const y = 10*line+22*Math.sin(x/91+line*.35)+12*Math.cos(x/37+line*.31);
      x ? draw.lineTo(x,y) : draw.moveTo(x,y);
    }
    draw.strokeStyle = line%6===0 ? '#e0ffc27a' : '#d2ffcc29';
    draw.lineWidth = line%6===0 ? 2.8 : 1.2;
    draw.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createRoom(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x18231d);
  scene.fog = new THREE.Fog(0x18231d,10,19);
  const camera = new THREE.PerspectiveCamera(53,1,.09,28);
  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  renderer.domElement.setAttribute('aria-label','A hand-built gallery with a rectangular projection screen and seating.');
  renderer.domElement.setAttribute('role','img');
  container.replaceChildren(renderer.domElement);
  const colors = {
    concrete:new THREE.MeshStandardMaterial({color:0x535e52,roughness:.94}),
    floor:new THREE.MeshStandardMaterial({color:0x586454,roughness:.69}),
    dark:new THREE.MeshStandardMaterial({color:0x202b20,roughness:.91}),
    wood:new THREE.MeshStandardMaterial({color:0x624832,roughness:.8}),
    metal:new THREE.MeshStandardMaterial({color:0x89927d,roughness:.5}),
  };
  function box(width,height,depth,x,y,z,material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),material);
    mesh.position.set(x,y,z);
    scene.add(mesh);
  }
  box(10,.15,13,0,-.075,0,colors.floor);
  box(.15,3.8,13,-5,1.9,0,colors.concrete);
  box(.15,3.8,13,5,1.9,0,colors.concrete);
  box(10,3.8,.16,0,1.9,-6.5,colors.concrete);
  box(10,3.8,.16,0,1.9,6.5,colors.concrete);
  box(10,.16,13,0,3.85,0,colors.dark);
  for (const z of [-5,-2.7,0,2.7,5]) {
    box(10,.22,.25,0,3.65,z,colors.dark);
    box(.3,3.65,.42,-4.75,1.8,z,colors.concrete);
    box(.3,3.65,.42,4.75,1.8,z,colors.concrete);
  }
  for (const x of [-2.5,2.5]) box(.035,.68,.035,x,3.34,0,colors.metal);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(5.05,2.53),new THREE.MeshBasicMaterial({map:screenTexture(),side:THREE.DoubleSide}));
  screen.position.set(0,1.77,0);
  scene.add(screen);
  for (const z of [2.0,3.25,4.5]) for (const x of [-1.9,-.75,.4,1.55]) {
    box(.59,.12,.58,x,.49,z,colors.wood);
    box(.59,.48,.09,x,.73,z+.26,colors.wood);
    for (const dx of [-.24,.24]) for (const dz of [-.22,.22]) box(.04,.5,.04,x+dx,.25,z+dz,colors.dark);
  }
  box(.9,.07,.65,1.34,.8,-1.82,colors.wood);
  box(.58,.23,.42,1.34,.95,-1.82,colors.dark);
  for(const x of [1,1.68]) box(.06,.8,.06,x,.4,-1.82,colors.metal);
  scene.add(new THREE.HemisphereLight(0xaeceaa,0x3e3b2b,1.45));
  const projection = new THREE.PointLight(0x80e5a4,23,8);
  projection.position.set(.2,1.95,.76);scene.add(projection);
  const practical = new THREE.PointLight(0xffbe62,24,8);
  practical.position.set(2.35,.55,-2.8);scene.add(practical);

  let current = 'front';
  let motion = 0;
  const render = () => renderer.render(scene,camera);
  function resize() {
    const {clientWidth:width,clientHeight:height}=container;
    if(!width||!height)return;
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();render();
  }
  const observer=new ResizeObserver(resize);observer.observe(container);
  camera.position.copy(pose.front);camera.lookAt(look.front);resize();

  return {
    move(to, reduce) {
      if(to===current)return;
      const from=current;
      current=to;
      const token=++motion;
      if(reduce){camera.position.copy(pose[to]);camera.lookAt(look[to]);render();return;}
      // Travel down the right aisle, then turn around the screen.
      const route = new THREE.CatmullRomCurve3([
        camera.position.clone(),new THREE.Vector3(3.55,1.61,from==='front'?2.1:-1.72),
        new THREE.Vector3(3.60,1.61,to==='back'?-1.66:1.92),pose[to],
      ]);
      const start=performance.now();
      const aim=new THREE.Vector3();
      function frame(now){
        if(token!==motion)return;
        const time=Math.min(1,(now-start)/1250);
        const t=time*time*(3-2*time);
        camera.position.copy(route.getPoint(t));
        aim.copy(look[from]).lerp(look[to],t);
        camera.lookAt(aim);render();
        if(time<1)requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    },
  };
}
