import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createMaterials, makeMiniature } from './miniatures';

let thumbnails;
// One short-lived renderer creates all thumbnails from the same original scene models.
export default function useMiniatureThumbnails() {
  const [images,setImages]=useState(thumbnails || {});
  useEffect(()=>{
    if(thumbnails){setImages(thumbnails);return;}
    let renderer;
    try {renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});}
    catch {return;} // Keep the accessible vector fallback when WebGL is unavailable.
    renderer.setSize(180,160);renderer.setPixelRatio(1);
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    const scene=new THREE.Scene();
    const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromScene(room,.06);
    scene.environment=target.texture;scene.environmentIntensity=.5;room.dispose();pmrem.dispose();
    scene.add(new THREE.HemisphereLight('#e9f2ff','#d7cbc0',1.1));
    const key=new THREE.DirectionalLight('#fff4e3',3.1);key.position.set(-4,8,6);scene.add(key);
    const fill=new THREE.DirectionalLight('#d8e4f4',1.3);fill.position.set(6,4,-5);scene.add(fill);
    const camera=new THREE.OrthographicCamera(-1.55,1.55,1.38,-1.38,.1,50);camera.position.set(3.5,3.6,6);camera.lookAt(0,.72,0);
    const materials=createMaterials(),result={};
    for(const type of ['edge','service','database','cache','worker','storage','auth']) {
      const model=makeMiniature({id:type==='auth'?'auth':type,type:type==='auth'?'service':type},materials);
      scene.add(model);renderer.render(scene,camera);result[type]=renderer.domElement.toDataURL('image/png');
      scene.remove(model);model.traverse(o=>o.geometry?.dispose());
    }
    Object.values(materials).forEach(m=>m.dispose());target.dispose();renderer.dispose();
    thumbnails=result;setImages(result);
  },[]);
  return images;
}
