import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Original small-scale product models. No downloaded meshes or textures.
export function createMaterials() {
  const material = (color, roughness = .38, metalness = .08) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  return {
    porcelain: material('#eae8df'), ivory: material('#f8f5ed'), shell: material('#c4cbc9'),
    graphite: material('#303b42', .42, .22), inset: material('#172a32', .48, .12),
    red: material('#bc4850', .32, .14), copper: material('#bf9d73', .31, .45),
    steel: material('#899b9f', .32, .55), pale: material('#d4dfda'),
    mint: new THREE.MeshStandardMaterial({ color: '#8db7a5', emissive: '#527e68', emissiveIntensity: .35, roughness: .35 }),
    lens: new THREE.MeshStandardMaterial({ color: '#afded5', roughness: .18, metalness: .25 }),
  };
}
function mesh(group, geometry, material, x = 0, y = 0, z = 0) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;
  group.add(object);
  return object;
}
function rounded(group, size, position, material, radius = .08) {
  return mesh(group, new RoundedBoxGeometry(...size, 3, Math.min(radius, ...size.map(v => v / 2))), material, ...position);
}
function cylinder(group, radius, height, position, material) {
  return mesh(group, new THREE.CylinderGeometry(radius, radius, height, 48), material, ...position);
}
function torus(group, radius, tube, position, material, horizontal = false) {
  const ring = mesh(group, new THREE.TorusGeometry(radius, tube, 8, 48), material, ...position);
  if (horizontal) ring.rotation.x = -Math.PI / 2;
  return ring;
}
function led(group, x, y, z, m) { return mesh(group, new THREE.SphereGeometry(.028, 10, 8), m, x, y, z); }
function screw(group, x, y, z, m) {
  const s = cylinder(group, .022, .015, [x, y, z], m); s.rotation.x = Math.PI / 2;
}
function drive(group, y, m, width = .91) {
  rounded(group, [width, .24, .08], [0, y, .49], m.inset, .04);
  rounded(group, [.48, .035, .015], [-.08, y+.025, .537], m.steel, .008);
  led(group, width/2-.12, y, .545, m.mint);
  for (let i = 0; i < 4; i++) rounded(group, [.045, .025, .018], [-.31+i*.085, y-.055, .54], m.graphite, .006);
}
function extrudedSymbol(group, points, material, position, depth = .055) {
  const shape = new THREE.Shape(); points.forEach(([x,y], i) => i ? shape.lineTo(x,y) : shape.moveTo(x,y)); shape.closePath();
  const object = mesh(group, new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: .025, bevelThickness: .02, bevelSegments: 3, steps: 1 }), material, ...position);
  return object;
}
export function makeMiniature(node, m) {
  const group = new THREE.Group(); group.userData.id = node.id;
  // Small ceramic display stand with a chamfered edge and floating shadow gap.
  rounded(group, [1.96,.12,1.74], [0,.04,0], m.shell, .11);
  rounded(group, [1.94,.13,1.72], [0,.135,0], m.ivory, .13);
  for (const x of [-.65,.65]) for (const z of [-.52,.52]) rounded(group,[.15,.06,.15],[x,-.04,z],m.graphite,.035);
  rounded(group,[.27,.035,.045],[-.55,.215,.67],m.red,.015);
  if (node.type === 'edge') {
    rounded(group,[1.45,.49,1.02],[0,.52,0],m.porcelain,.16);
    rounded(group,[1.32,.055,.91],[0,.78,0],m.ivory,.045);
    rounded(group,[1.19,.17,.055],[0,.48,.51],m.inset,.04);
    for(let i=0;i<4;i++) rounded(group,[.13,.085,.025],[-.37+i*.22,.48,.55],m.steel,.015);
    led(group,.5,.65,.5,m.mint);
    for(const x of [-.54,.54]) {
      const antenna=rounded(group,[.095,.9,.095],[x,.99,-.31],m.graphite,.045);
      antenna.rotation.z=x<0?-.16:.16;
      rounded(group,[.1,.11,.1],[x+(x<0?.065:-.065),.63,-.31],m.red,.04);
    }
    for(let i=0;i<5;i++) rounded(group,[.37,.012,.026],[0,.816,-.22+i*.11],m.shell,.007);
  } else if (node.type === 'database') {
    // Turned rounded drum profile, with thin separation bands rather than red lids.
    const profile = [[0,.22],[.5,.22],[.63,.26],[.68,.34],[.68,1.43],[.65,1.51],[.57,1.55],[0,1.55]].map(([r,y])=>new THREE.Vector2(r,y));
    mesh(group,new THREE.LatheGeometry(profile,64),m.porcelain);
    for(const y of [.62,1.04]) torus(group,.682,.022,[0,y,0],m.steel,true);
    cylinder(group,.57,.025,[0,1.558,0],m.ivory);
    torus(group,.45,.017,[0,1.577,0],m.shell,true);
    cylinder(group,.2,.015,[0,1.58,0],m.pale);
    rounded(group,[.33,.16,.055],[0,.42,.675],m.inset,.035);
    led(group,.09,.42,.714,m.mint);
    rounded(group,[.08,.65,.025],[-.4,.95,.55],m.red,.025);
  } else if (node.type === 'cache') {
    rounded(group,[1.25,.12,1.13],[0,.33,0],m.graphite,.09);
    for(let i=0;i<6;i++) for(const side of [-1,1]) {
      rounded(group,[.15,.07,.065],[side*.67,.32,-.38+i*.15],m.copper,.02);
      rounded(group,[.065,.07,.15],[-.43+i*.17,.32,side*.61],m.copper,.02);
    }
    rounded(group,[1.0,.38,.91],[0,.56,0],m.red,.12);
    rounded(group,[.82,.08,.74],[0,.78,0],m.porcelain,.07);
    for(let i=0;i<4;i++) rounded(group,[.75,.06,.055],[0,.84,-.25+i*.16],m.steel,.02);
    const bolt=extrudedSymbol(group,[[-.03,.26],[-.19,-.02],[-.015,-.02],[-.08,-.25],[.19,.075],[.035,.075]],m.ivory,[0,.88,.02]);bolt.rotation.x=-Math.PI/2;
  } else if (node.type === 'storage') {
    rounded(group,[1.39,.99,1.1],[0,.75,0],m.porcelain,.16);
    rounded(group,[1.2,.77,.06],[0,.75,.55],m.graphite,.08);
    for(let i=0;i<3;i++) {
      const x=-.37+i*.37;
      rounded(group,[.29,.56,.06],[x,.78,.6],m.inset,.035);
      rounded(group,[.045,.3,.025],[x-.07,.8,.64],m.steel,.012);
      led(group,x+.055,.59,.645,m.mint);
    }
    rounded(group,[.51,.08,.045],[0,1.23,-.1],m.red,.03);
    rounded(group,[.62,.15,.36],[0,1.28,0],m.graphite,.075);
    rounded(group,[.4,.08,.37],[0,1.3,.015],m.porcelain,.035);
    for(let i=0;i<4;i++)rounded(group,[.02,.33,.04],[.704,.72,-.3+i*.15],m.steel,.01);
  } else if (node.type === 'worker') {
    rounded(group,[1.08,1.48,.99],[0,.95,0],m.graphite,.14);
    rounded(group,[.87,1.24,.055],[0,.95,.505],m.inset,.09);
    rounded(group,[.065,1.15,.035],[-.39,.95,.54],m.red,.02);
    for(const y of [.68,1.2]) {
      torus(group,.2,.025,[.035,y,.552],m.steel);
      for(let i=0;i<7;i++) {
        const angle=i*Math.PI*2/7;
        const blade=rounded(group,[.09,.19,.028],[.035+Math.sin(angle)*.105,y+Math.cos(angle)*.105,.56],m.shell,.035);blade.rotation.z=-angle+.4;
      }
      cylinder(group,.065,.025,[.035,y,.59],m.red).rotation.x=Math.PI/2;
    }
    led(group,.28,1.48,.55,m.mint);
    for(let i=0;i<5;i++)rounded(group,[.035,.72,.045],[.55,.94,-.3+i*.14],m.inset,.01);
  } else if (node.id === 'auth') {
    rounded(group,[1.08,1.4,.75],[0,.92,0],m.porcelain,.16);
    rounded(group,[.87,1.11,.07],[0,.95,.39],m.inset,.09);
    const shield=extrudedSymbol(group,[[-.29,.29],[0,.39],[.29,.29],[.25,-.1],[.13,-.27],[0,-.35],[-.13,-.27],[-.25,-.1]],m.red,[0,1.02,.44]);
    torus(group,.075,.027,[0,1.13,.525],m.ivory);
    rounded(group,[.13,.12,.035],[0,1.02,.53],m.ivory,.03);
    led(group,.3,.49,.44,m.mint);
    rounded(group,[.35,.03,.045],[0,1.64,0],m.steel,.01);
  } else {
    rounded(group,[1.19,1.49,.95],[0,.96,0],m.porcelain,.13);
    rounded(group,[1.04,1.25,.045],[0,.94,.48],m.graphite,.07);
    for(const y of [.55,.89,1.23]) drive(group,y,m);
    rounded(group,[.11,.055,.61],[-.37,1.73,-.03],m.red,.025);
    for(let i=0;i<5;i++)rounded(group,[.035,.75,.055],[.605,.95,-.3+i*.135],m.steel,.013);
    screw(group,-.44,1.48,.515,m.steel);screw(group,.44,.4,.515,m.steel);
  }
  return group;
}
