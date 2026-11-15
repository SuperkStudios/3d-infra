import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { requestPath } from './model';
import { createMaterials, makeMiniature } from './miniatures';

function routedCurve(start, end) {
  const delta = end.clone().sub(start);
  const alongX = Math.abs(delta.x) >= Math.abs(delta.z);
  const a = start.clone(), b = end.clone();
  if (alongX) { a.x += Math.sign(delta.x) * 1.06; b.x -= Math.sign(delta.x) * 1.06; }
  else { a.z += Math.sign(delta.z) * .96; b.z -= Math.sign(delta.z) * .96; }
  const middle = alongX
    ? [new THREE.Vector3((a.x+b.x)/2,a.y,a.z),new THREE.Vector3((a.x+b.x)/2,b.y,b.z)]
    : [new THREE.Vector3(a.x,a.y,(a.z+b.z)/2),new THREE.Vector3(b.x,b.y,(a.z+b.z)/2)];
  const points=[a,...middle,b].filter((p,i,all)=>i===0||p.distanceTo(all[i-1])>.001);
  const curve=new THREE.CurvePath(); let previous=points[0];
  for(let i=1;i<points.length-1;i++) {
    const corner=points[i], next=points[i+1];
    const radius=Math.min(.32,previous.distanceTo(corner)/2,corner.distanceTo(next)/2);
    const before=corner.clone().add(previous.clone().sub(corner).normalize().multiplyScalar(radius));
    const after=corner.clone().add(next.clone().sub(corner).normalize().multiplyScalar(radius));
    curve.add(new THREE.LineCurve3(previous,before));
    curve.add(new THREE.QuadraticBezierCurve3(before,corner,after));previous=after;
  }
  curve.add(new THREE.LineCurve3(previous,points.at(-1)));return curve;
}

export default function Scene({nodes,links,selected,onSelect,paused,fault,trace,view,reset}) {
  const host=useRef(),live=useRef({selected,paused,fault,trace});
  const [failed,setFailed]=useState(false);
  live.current={selected,paused,fault,trace};
  useEffect(()=>{
    let renderer;
    try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}
    catch {setFailed(true);return;}
    setFailed(false);
    const el=host.current;el.appendChild(renderer.domElement);
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    renderer.setClearColor('#ecece5',1);
    const scene=new THREE.Scene();scene.background=new THREE.Color('#ecece5');
    const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,150);
    const bounds=new THREE.Box3();nodes.forEach(n=>{
      bounds.expandByPoint(new THREE.Vector3(n.x-1.2,-.15,n.z-1.1));
      bounds.expandByPoint(new THREE.Vector3(n.x+1.2,2.2,n.z+1.1));
    });
    const center=bounds.getCenter(new THREE.Vector3());center.y=.65;
    camera.position.copy(center).add(view==='top'?new THREE.Vector3(0,30,.001):new THREE.Vector3(9,17,24));
    camera.lookAt(center);
    const controls=new OrbitControls(camera,renderer.domElement);
    controls.target.copy(center);controls.enableDamping=true;controls.dampingFactor=.08;
    controls.minZoom=.35;controls.maxZoom=3;controls.enablePan=true;
    controls.maxPolarAngle=view==='top'?.001:Math.PI/2.5;
    controls.minPolarAngle=view==='top'?0:.18;
    controls.update();
    const environment=new RoomEnvironment();const pmrem=new THREE.PMREMGenerator(renderer);
    const envTarget=pmrem.fromScene(environment,.06);scene.environment=envTarget.texture;scene.environmentIntensity=.5;
    environment.dispose();pmrem.dispose();
    scene.add(new THREE.HemisphereLight('#e9f2ff','#d7cbc0',1.1));
    const sun=new THREE.DirectionalLight('#fff4e3',3.1);sun.position.set(-8,17,10);sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);sun.shadow.radius=4;
    Object.assign(sun.shadow.camera,{left:bounds.min.x-5,right:bounds.max.x+5,top:bounds.max.z+8,bottom:bounds.min.z-8,far:80});
    sun.shadow.bias=-.0004;sun.shadow.normalBias=.025;scene.add(sun);
    const fill=new THREE.DirectionalLight('#d8e4f4',1.3);fill.position.set(10,6,-8);scene.add(fill);
    const materials=createMaterials();
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(160,160),new THREE.MeshStandardMaterial({color:'#e8e9e1',roughness:1}));
    ground.rotation.x=-Math.PI/2;ground.position.y=-.13;ground.receiveShadow=true;scene.add(ground);
    // Fine registration dots sit below the objects, avoiding a horizon full of harsh lines.
    const dots=[];for(let x=Math.floor(bounds.min.x)-3;x<bounds.max.x+3;x+=.65)for(let z=Math.floor(bounds.min.z)-3;z<bounds.max.z+3;z+=.65)dots.push(x,-.12,z);
    const grid=new THREE.BufferGeometry();grid.setAttribute('position',new THREE.Float32BufferAttribute(dots,3));
    scene.add(new THREE.Points(grid,new THREE.PointsMaterial({color:'#89978e',size:.026,transparent:true,opacity:.34,sizeAttenuation:true})));
    const objects=[],highlights=[],labels=[];
    const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
    const ctx=shadowCanvas.getContext('2d');const gradient=ctx.createRadialGradient(64,64,10,64,64,64);
    gradient.addColorStop(0,'rgba(35,48,46,.22)');gradient.addColorStop(.65,'rgba(35,48,46,.08)');gradient.addColorStop(1,'rgba(35,48,46,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
    const shadowTexture=new THREE.CanvasTexture(shadowCanvas);
    nodes.forEach(n=>{
      const group=makeMiniature(n,materials);group.position.set(n.x,0,n.z);scene.add(group);objects.push(group);
      const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.2,2.9),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(n.x,-.115,n.z);scene.add(shadow);
      const highlight=new THREE.Mesh(new RoundedBoxGeometry(2.12,.055,1.9,3,.2),new THREE.MeshStandardMaterial({color:'#c65b60',roughness:.7,transparent:true,opacity:.75}));
      highlight.position.set(n.x,-.005,n.z);scene.add(highlight);highlights.push([n.id,highlight]);
      const label=document.createElement('button');label.className='node-label';label.textContent=n.name;
      label.onclick=()=>onSelect(n.id);el.appendChild(label);
      const leader=document.createElement('span');leader.className='node-label-leader';leader.setAttribute('aria-hidden','true');el.appendChild(leader);
      labels.push({node:n,element:label,leader,width:label.offsetWidth||90,bounds:new THREE.Box3().setFromObject(group)});
    });
    const curves=links.map(([a,b])=>{
      const A=nodes.find(n=>n.id===a),B=nodes.find(n=>n.id===b);
      const curve=routedCurve(new THREE.Vector3(A.x,.015,A.z),new THREE.Vector3(B.x,.015,B.z));
      const line=new THREE.Mesh(new THREE.TubeGeometry(curve,64,.022,8,false),new THREE.MeshStandardMaterial({color:'#8b9a95',roughness:.75}));scene.add(line);
      const dot=new THREE.Mesh(new THREE.SphereGeometry(.055,12,12),materials.red);scene.add(dot);
      // Small sockets give each routed path a deliberate termination.
      for(const t of [0,1]){const socket=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.035,16),materials.steel);socket.position.copy(curve.getPoint(t));scene.add(socket);}
      return {a,b,curve,dot,line};
    });
    function fitCamera(){
      camera.updateMatrixWorld();let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
      for(const node of nodes)for(const x of [node.x-1.15,node.x+1.15])for(const y of [-.15,1.95])for(const z of [node.z-1.05,node.z+1.05]){
        const p=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);
        minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);
      }
      const width=el.clientWidth,height=el.clientHeight,aspect=width/height;
      // Header and footer remain free of models, including in narrow layouts.
      const usableWidth=Math.max(.45,(width-40)/width),usableHeight=Math.max(.45,(height-155)/height);
      const halfHeight=Math.max((maxY-minY)/(2*usableHeight),(maxX-minX)/(2*aspect*usableWidth));
      const midX=(minX+maxX)/2,midY=(minY+maxY)/2+halfHeight*24/height;
      camera.left=midX-halfHeight*aspect;camera.right=midX+halfHeight*aspect;
      camera.top=midY+halfHeight;camera.bottom=midY-halfHeight;camera.updateProjectionMatrix();
    }
    const resize=()=>{if(!el.clientWidth||!el.clientHeight)return;renderer.setSize(el.clientWidth,el.clientHeight);fitCamera();};
    const observer=new ResizeObserver(resize);observer.observe(el);resize();
    const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down;
    const onDown=e=>{down=[e.clientX,e.clientY];};
    const click=e=>{
      if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
      const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
      ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(objects,true)[0];
      if(hit){let object=hit.object;while(!object.userData.id&&object.parent)object=object.parent;onSelect(object.userData.id);}
    };
    renderer.domElement.addEventListener('pointerdown',onDown);renderer.domElement.addEventListener('pointerup',click);
    let frame,time=0,last=performance.now();
    function animate(now){
      frame=requestAnimationFrame(animate);if(!live.current.paused)time+=(now-last)/1000;last=now;controls.update();
      highlights.forEach(([id,h])=>{h.visible=id===live.current.selected||id===live.current.fault;h.material.color.set(id===live.current.fault?'#d19a53':'#bb525d');});
      curves.forEach(({a,b,curve,dot,line},i)=>{
        const step=live.current.trace;
        const forward=step>=0&&step<requestPath.length-1&&a===requestPath[step]&&b===requestPath[step+1];
        const reverse=step>=0&&step<requestPath.length-1&&b===requestPath[step]&&a===requestPath[step+1];
        const active=forward||reverse,t=(time*(active?.65:.16)+i*.17)%1;
        dot.position.copy(curve.getPoint(reverse?1-t:t));dot.position.y+=.07;dot.scale.setScalar(active?1.4:1);
        dot.visible=!live.current.paused;line.material.color.set(active?'#bd4c57':'#8b9a95');
      });
      const projected=labels.map(entry=>{
        const bounds=entry.bounds;let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
        for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
          const p=new THREE.Vector3(x,y,z).project(camera),sx=(p.x*.5+.5)*el.clientWidth,sy=(-p.y*.5+.5)*el.clientHeight;
          left=Math.min(left,sx);right=Math.max(right,sx);top=Math.min(top,sy);bottom=Math.max(bottom,sy);
        }
        return {...entry,rect:{left,right,top,bottom}};
      });
      const placed=[],intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
      // Keep labels clear of both other labels AND neighboring miniature silhouettes.
      projected.sort((a,b)=>(b.node.id===live.current.selected)-(a.node.id===live.current.selected)).forEach(({node:n,element:label,leader,width,rect:model})=>{
        const height=22,cx=(model.left+model.right)/2;
        const candidates=[
          [cx,model.bottom+15],
          [model.left-width/2-8,model.bottom+12],
          [model.right+width/2+8,model.bottom+12],
          [model.left-width/2-8,(model.top+model.bottom)/2],
          [model.right+width/2+8,(model.top+model.bottom)/2],
          [cx,model.top-15],
        ];
        const point=candidates.find(([x,y])=>{
          const rect={left:x-width/2-4,right:x+width/2+4,top:y-height/2-2,bottom:y+height/2+2};
          return rect.left>=8&&rect.right<=el.clientWidth-8&&rect.top>=78&&rect.bottom<=el.clientHeight-64
            &&!projected.some(other=>intersects(rect,other.rect))&&!placed.some(other=>intersects(rect,other));
        });
        label.style.display=point?'':'none';leader.style.display=point?'':'none';
        if(point){
          const [x,y]=point;placed.push({left:x-width/2-4,right:x+width/2+4,top:y-height/2-2,bottom:y+height/2+2});label.style.left=`${x}px`;label.style.top=`${y}px`;
          const ax=THREE.MathUtils.clamp(x,model.left+5,model.right-5),ay=THREE.MathUtils.clamp(y,model.top+3,model.bottom-3);
          const bx=THREE.MathUtils.clamp(ax,x-width/2,x+width/2),by=THREE.MathUtils.clamp(ay,y-height/2,y+height/2);
          leader.style.left=`${ax}px`;leader.style.top=`${ay}px`;leader.style.width=`${Math.hypot(bx-ax,by-ay)}px`;leader.style.transform=`rotate(${Math.atan2(by-ay,bx-ax)}rad)`;
        }
        label.classList.toggle('selected',n.id===live.current.selected);label.classList.toggle('degraded-label',n.id===live.current.fault);
      });
      renderer.render(scene,camera);
    }
    frame=requestAnimationFrame(animate);
    return()=>{
      cancelAnimationFrame(frame);observer.disconnect();controls.dispose();
      const geometries=new Set(),allMaterials=new Set(Object.values(materials));
      scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>allMaterials.add(m));});
      geometries.forEach(g=>g.dispose());allMaterials.forEach(m=>m.dispose());shadowTexture.dispose();envTarget.dispose();renderer.dispose();el.replaceChildren();
    };
  },[nodes,links,view,reset,onSelect]);
  return <div className="scene" ref={host} aria-label="Interactive 3D infrastructure topology">{failed&&<div className="fallback">3D requires WebGL. Use the component list to inspect and simulate your infrastructure.</div>}</div>;
}
