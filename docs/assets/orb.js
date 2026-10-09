/* Independent, deterministic Canvas renderer for the living navigation orb. */
(function () {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const normalize = (p) => {
    const d = Math.hypot(p.x, p.y, p.z) || 1;
    return { x: p.x / d, y: p.y / d, z: p.z / d };
  };
  const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
  const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  const mix = (a, b, f) => ({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f });

  function geometry(lowPower = false) {
    let seed = 4817;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    // A jittered spherical Voronoi shell gives large crooked apertures alongside
    // tiny slits. No regular geodesic honeycomb or identical circular windows.
    const count=lowPower?70:94, goldenAngle=Math.PI*(3-Math.sqrt(5));
    const points=Array.from({length:count},(_,i)=>{
      const y=1-2*(i+.5)/count, r=Math.sqrt(1-y*y);
      const angle=i*goldenAngle+(random()-.5)*1.28;
      return normalize({x:Math.cos(angle)*r+(random()-.5)*.19,y:y+(random()-.5)*.19,z:Math.sin(angle)*r+(random()-.5)*.19});
    });
    const faces=[], corners=[];
    // Convex hull and spherical circumcentres are computed once at startup.
    // Shared corners keep the irregular metal struts connected during deformation.
    for(let a=0;a<count-2;a+=1)for(let b=a+1;b<count-1;b+=1)for(let c=b+1;c<count;c+=1){
      const ab={x:points[b].x-points[a].x,y:points[b].y-points[a].y,z:points[b].z-points[a].z};
      const ac={x:points[c].x-points[a].x,y:points[c].y-points[a].y,z:points[c].z-points[a].z};
      const plane=normalize(cross(ab,ac));
      const planeDistance=dot(plane,points[a]);
      let side=0, hull=true;
      for(let n=0;n<count;n+=1){
        if(n===a||n===b||n===c)continue;
        const distance=dot(plane,points[n])-planeDistance;
        if(Math.abs(distance)<1e-7)continue;
        const sign=Math.sign(distance);
        if(side && side!==sign){hull=false;break;}
        side=sign;
      }
      if(hull){
        faces.push([a,b,c]);
        corners.push(planeDistance<0?{x:-plane.x,y:-plane.y,z:-plane.z}:plane);
      }
    }
    const adjacent = points.map(() => []);
    faces.forEach((face, i) => face.forEach((v) => adjacent[v].push(i)));
    const cells = points.map((center, i) => {
      const tangent = normalize(cross(center, Math.abs(center.y)>.85 ? {x:1,y:0,z:0} : {x:0,y:1,z:0}));
      const bitangent = cross(center, tangent);
      const boundary = adjacent[i].map((n) => corners[n]).sort((a,b) => Math.atan2(dot(a,bitangent),dot(a,tangent)) - Math.atan2(dot(b,bitangent),dot(b,tangent)));
      const smallAperture=i%6===0;
      const opening = smallAperture ? .46+random()*.21 : .90+random()*.085;
      const phase = random()*TAU;
      const orientation=random()*TAU, squeeze=smallAperture?.30+random()*.23:i%4===0?.47+random()*.17:.87+random()*.12;
      const hole = boundary.map((p,n) => {
        const angle=Math.atan2(dot(p,bitangent),dot(p,tangent))-orientation;
        const elongation=squeeze+(1-squeeze)*Math.abs(Math.cos(angle));
        const distortion=.97+.03*Math.sin(n*2.7+phase);
        return normalize(mix(center,p,opening*elongation*distortion));
      });
      return { center, boundary, hole, phase, orientation, rounding:.40+random()*.09, hue: random(), shine: random(), id: i };
    });
    const spines = corners.filter((p,i) => i%5===0).map((p,i) => ({ p, height: .08 + random()*.25, phase: random()*TAU, twist: random()*.20-.10, id:i }));
    return {cells, spines};
  }

  function aperturePath(ctx,points,rounding=.28,append=false){
    if(!append)ctx.beginPath();
    const first=points[0],last=points[points.length-1];
    ctx.moveTo(first.x+(last.x-first.x)*rounding,first.y+(last.y-first.y)*rounding);
    for (let i = 0; i < points.length; i += 1) {
      const p=points[i], next=points[(i+1)%points.length];
      ctx.quadraticCurveTo(p.x,p.y,p.x+(next.x-p.x)*rounding,p.y+(next.y-p.y)*rounding);
      ctx.lineTo(next.x+(p.x-next.x)*rounding,next.y+(p.y-next.y)*rounding);
    }
    ctx.closePath();
  }

  window.createOrb = function createOrb(canvas, options = {}) {
    if (!canvas || !canvas.getContext) return null;
    const ctx = canvas.getContext('2d', {alpha:true});
    if (!ctx) return null;
    const lowPower = Boolean(options.lowPower);
    const mesh = geometry(lowPower);
    let reducedMotion = Boolean(options.reducedMotion);
    let active = options.active !== false, destroyed = false, raf = 0, time = 2.5, lastFrame = 0;
    let width = 300, height = 300, radius = 96, pulseAt = -100;
    const frameInterval = 1000 / (lowPower ? 24 : 30);
    let dpr = 1;

    function deform(p, t, amount = 1) {
      const theta = Math.atan2(p.z,p.x), phi = Math.acos(clamp(p.y,-1,1));
      const swell = 1 + amount*(.060*Math.sin(theta*3+phi*2+t*.78) + .039*Math.sin(phi*7-theta*2-t*.93) + .027*Math.cos(p.x*9+p.z*5+t*1.27));
      const twist = amount*.165*Math.sin(p.y*3.9+t*.61);
      const cs = Math.cos(twist), sn = Math.sin(twist);
      const x = (p.x*cs-p.z*sn)*swell*(1+.036*Math.sin(t*.57));
      const y = p.y*swell*(1+.025*Math.sin(t*.71+1.9));
      const z = (p.x*sn+p.z*cs)*swell*(1-.038*Math.sin(t*.57));
      const ax = .15*t+.32*Math.sin(t*.33), ay = .19*t+.28*Math.sin(t*.51+1), az = .065*t+.19*Math.sin(t*.41);
      const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay), cz = Math.cos(az), sz = Math.sin(az);
      const y1 = y*cx-z*sx, z1 = y*sx+z*cx;
      const x2 = x*cy+z1*sy, z2 = -x*sy+z1*cy;
      return { x:x2*cz-y1*sz, y:x2*sz+y1*cz, z:z2 };
    }

    function project(p) {
      const perspective = 3.9/(3.9-p.z);
      return {x:width/2+p.x*radius*perspective, y:height/2+p.y*radius*perspective, z:p.z, scale:perspective};
    }

    function glow(x,y,r,color,alpha) {
      if (alpha <= 0) return;
      const gradient = ctx.createRadialGradient(x,y,0,x,y,r);
      gradient.addColorStop(0,color.replace('ALPHA',String(alpha)));
      gradient.addColorStop(.35,color.replace('ALPHA',String(alpha*.38)));
      gradient.addColorStop(1,color.replace('ALPHA','0'));
      ctx.fillStyle = gradient;
      ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
    }

    function drawCell(cell, rear, t) {
      const projected = cell.projected, hole = cell.aperture, center = cell.screen;
      const near = clamp((cell.world.z+.1)/1.15,0,1);
      const light = clamp((cell.world.x*-.43-cell.world.y*.6+cell.world.z*.62+.7)/1.8,0,1);
      const intensity = .79+.15*Math.sin(t*.63+cell.phase);
      ctx.globalAlpha = rear ? .22 : 1;
      // An opalescent inner film is visible through each perforation.
      aperturePath(ctx,hole,cell.rounding);
      ctx.save(); ctx.clip();
      const minX = Math.min(...hole.map(p=>p.x)), maxX = Math.max(...hole.map(p=>p.x));
      const minY = Math.min(...hole.map(p=>p.y)), maxY = Math.max(...hole.map(p=>p.y));
      const spread = Math.max(maxX-minX,maxY-minY)*.86;
      const drift = .16*Math.sin(t*.42+cell.phase);
      const angle=cell.orientation+drift;
      const film = ctx.createLinearGradient(center.x-Math.cos(angle)*spread*.65,center.y-Math.sin(angle)*spread*.65,center.x+Math.cos(angle)*spread*.65,center.y+Math.sin(angle)*spread*.65);
      const palette = cell.hue<.5 ? ['#22e6f2','#9df7d9','#687cf0','#f194cf','#f7da91','#48e4ce'] : ['#b783f3','#ffc7a9','#35e1f2','#8ff6d3','#ee8bc4','#6771dc'];
      palette.forEach((color,i)=>film.addColorStop(i/(palette.length-1),color));
      ctx.fillStyle = film; ctx.globalAlpha *= (.32+near*.44)*intensity;
      ctx.fillRect(minX-2,minY-2,maxX-minX+4,maxY-minY+4);
      const membrane=ctx.createRadialGradient(center.x-spread*.13,center.y-spread*.15,0,center.x,center.y,Math.max(1,spread*.69));
      membrane.addColorStop(0,'rgba(172,248,236,.26)');membrane.addColorStop(.48,'rgba(112,241,235,.11)');membrane.addColorStop(1,'rgba(143,108,237,0)');
      ctx.fillStyle=membrane;ctx.fillRect(minX-2,minY-2,maxX-minX+4,maxY-minY+4);
      // Slow, irregular caustics travel beneath the shell, rather than rotating decals.
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha=rear?.26:.78;
      ctx.lineWidth = Math.max(.65,radius*.007);
      for (let line=0; line<(lowPower?1:3); line+=1) {
        ctx.strokeStyle = line===0?'rgba(125,250,240,.82)':line===1?'rgba(244,156,214,.68)':'rgba(225,255,249,.72)';
        const offset = Math.sin(t*.45+cell.phase+line*2.4)*spread*.38;
        ctx.beginPath();
        ctx.moveTo(minX-spread*.1,minY+spread*.4+offset);
        ctx.bezierCurveTo(center.x-spread*.6,center.y+spread*.52,center.x+spread*.44,center.y-spread*.57+offset,maxX+spread*.1,maxY-spread*.31+offset);
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = rear ? .30 : 1;
      // A dark metallic cellular web; the aperture remains genuinely cut out.
      const shell = ctx.createLinearGradient(center.x-spread,center.y-spread,center.x+spread,center.y+spread);
      shell.addColorStop(0,`rgba(${Math.round(25+light*35)},${Math.round(39+light*44)},${Math.round(52+light*46)},.98)`);
      shell.addColorStop(.27,'rgba(9,20,29,.99)');
      shell.addColorStop(.55,'rgba(1,5,12,.99)');
      shell.addColorStop(.81,'rgba(18,20,37,.98)');
      shell.addColorStop(1,'rgba(61,57,82,.98)');
      aperturePath(ctx,projected,cell.rounding);
      aperturePath(ctx,hole,cell.rounding,true);
      ctx.fillStyle=shell; ctx.fill('evenodd');
      // Fine bevels catch cyan edge light and an occasional violet reflection.
      aperturePath(ctx,hole,cell.rounding);
      const rim = ctx.createLinearGradient(center.x-spread*.5,center.y-spread*.7,center.x+spread*.5,center.y+spread*.7);
      rim.addColorStop(0,`rgba(212,255,254,${.46+light*.47})`);
      rim.addColorStop(.31,'rgba(73,176,194,.71)');
      rim.addColorStop(.55,'rgba(9,23,35,.93)');
      rim.addColorStop(.77,'rgba(139,131,179,.67)');
      rim.addColorStop(1,`rgba(216,202,223,${.31+near*.24})`);
      ctx.lineWidth = radius*(rear?.009:.017); ctx.strokeStyle=rim; ctx.stroke();
      if (!rear && cell.shine>.68 && light>.46) {
        const rimPoint=hole[0];
        glow(rimPoint.x,rimPoint.y,radius*.023,'rgba(143,232,255,ALPHA)',.35*light);
      }
      ctx.globalAlpha=1;
    }

    function drawSpine(spine,t) {
      const base=spine.world;
      const tip=project({x:base.x*(1+spine.height)+spine.twist*Math.sin(t*.49+spine.phase),y:base.y*(1+spine.height),z:base.z*(1+spine.height)});
      const start=project(base);
      const tangent=normalize(cross(base,{x:.2,y:1,z:.3}));
      const side1=project({x:base.x+tangent.x*.036,y:base.y+tangent.y*.036,z:base.z+tangent.z*.036});
      const side2=project({x:base.x-tangent.x*.036,y:base.y-tangent.y*.036,z:base.z-tangent.z*.036});
      ctx.globalAlpha=base.z<.16?.24:.84;
      ctx.beginPath(); ctx.moveTo(side1.x,side1.y);
      const bend=Math.sin(t*.83+spine.phase)*radius*.015;
      ctx.quadraticCurveTo(start.x+(tip.x-start.x)*.42+bend,start.y+(tip.y-start.y)*.42,tip.x,tip.y);
      ctx.quadraticCurveTo(start.x+(tip.x-start.x)*.44-bend,start.y+(tip.y-start.y)*.5,side2.x,side2.y);
      ctx.closePath(); ctx.fillStyle='#030912';ctx.fill();
      ctx.beginPath();ctx.moveTo(side1.x,side1.y);ctx.quadraticCurveTo(start.x+(tip.x-start.x)*.42+bend,start.y+(tip.y-start.y)*.42,tip.x,tip.y);
      ctx.strokeStyle=base.y<0?'rgba(180,235,240,.87)':'rgba(139,166,218,.56)';ctx.lineWidth=radius*.008;ctx.stroke();
      ctx.globalAlpha=1;
    }

    function render() {
      if (destroyed) return;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,width,height);
      const t=time, pulseAge=t-pulseAt;
      const pulse = pulseAge>=0 && pulseAge<1.25 ? Math.sin(Math.PI*pulseAge/1.25)*Math.exp(-pulseAge*.8) : 0;
      const breath = .88+.12*Math.sin(t*.77);
      ctx.globalCompositeOperation='screen';
      glow(width/2,height/2,radius*1.53,'rgba(29,145,195,ALPHA)',.16*breath+pulse*.17);
      glow(width/2+radius*.27,height/2-radius*.15,radius*1.12,'rgba(104,59,185,ALPHA)',.10*breath);
      ctx.globalCompositeOperation='source-over';
      mesh.cells.forEach((cell) => {
        cell.world=deform(cell.center,t);
        cell.screen=project(cell.world);
        cell.projected=cell.boundary.map(p=>project(deform(p,t)));
        cell.aperture=cell.hole.map(p=>project(deform(p,t)));
      });
      const sorted=mesh.cells.slice().sort((a,b)=>a.world.z-b.world.z);
      mesh.spines.forEach(s=>{s.world=deform(s.p,t);});
      mesh.spines.filter(s=>s.world.z<.18).sort((a,b)=>a.world.z-b.world.z).forEach(s=>drawSpine(s,t));
      sorted.filter(c=>c.world.z<.18).forEach(c=>drawCell(c,true,t));
      ctx.globalCompositeOperation='screen';
      glow(width/2-radius*.08,height/2+radius*.05,radius*.88,'rgba(64,218,232,ALPHA)',.49*breath+pulse*.2);
      glow(width/2+radius*.14,height/2-radius*.1,radius*.64,'rgba(161,118,249,ALPHA)',.31*breath);
      glow(width/2-radius*.1,height/2+radius*.06,radius*.35,'rgba(220,255,255,ALPHA)',.87*breath);
      // Three bent filaments inside the core give glimpses of an enclosed energy source.
      for(let i=0;i<3;i+=1) {
        ctx.beginPath();
        for(let n=0;n<=32;n+=1) {
          const u=n/32*TAU, phase=t*.21+i*1.6;
          const p=deform({x:Math.cos(u)*(.54+.08*Math.sin(u*3+phase)),y:Math.sin(u)*.59,z:Math.sin(u*2+phase)*.25},t,.38);
          const q=project(p);
          if(n===0)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);
        }
        ctx.strokeStyle=i===1?'rgba(208,151,248,.66)':'rgba(160,250,242,.66)';ctx.lineWidth=radius*.012;ctx.stroke();
      }
      ctx.globalCompositeOperation='source-over';
      const front=sorted.filter(c=>c.world.z>=.18);
      front.forEach(c=>drawCell(c,false,t));
      mesh.spines.filter(s=>s.world.z>=.18).sort((a,b)=>a.world.z-b.world.z).forEach(s=>drawSpine(s,t));
      // Restrained scattered reflections, never a full-frame flashing light.
      ctx.globalCompositeOperation='screen';
      glow(width/2-radius*.39,height/2-radius*.47,radius*.18,'rgba(117,225,255,ALPHA)',.17*breath);
      if(pulse>0) {
        const r=radius*(1.08+pulseAge*.47);
        ctx.beginPath();ctx.ellipse(width/2,height/2,r,r*.97,-.2,0,TAU);
        ctx.strokeStyle=`rgba(133,223,235,${pulse*.18})`;ctx.lineWidth=radius*.012;ctx.stroke();
      }
      ctx.globalCompositeOperation='source-over';
      ctx.globalAlpha=1;
    }

    function frame(stamp) {
      raf=0;
      if(destroyed || !active || document.hidden || reducedMotion)return;
      if(!lastFrame)lastFrame=stamp;
      const elapsed=stamp-lastFrame;
      if(elapsed>=frameInterval-.5) {
        time+=Math.min(elapsed/1000,.08);
        lastFrame=stamp-(elapsed%frameInterval);
        render();
      }
      raf=requestAnimationFrame(frame);
    }
    function start() {
      if(!raf && active && !document.hidden && !reducedMotion && !destroyed) {
        lastFrame=0;raf=requestAnimationFrame(frame);
      }
    }
    function stop() {if(raf)cancelAnimationFrame(raf);raf=0;lastFrame=0;}
    function resize() {
      if(destroyed)return;
      const rect=canvas.getBoundingClientRect();
      width=Math.max(1,rect.width||300);height=Math.max(1,rect.height||300);
      dpr=Math.min(window.devicePixelRatio||1,lowPower?1.5:2);
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
      radius=Math.min(width,height)*.316;
      render();
    }
    function visibility() {if(document.hidden)stop();else start();}
    document.addEventListener('visibilitychange',visibility);
    resize();start();
    return {
      pulse() {
        if(destroyed)return;
        if(reducedMotion) {
          pulseAt=-100;render();
        } else {pulseAt=time;start();}
      },
      setActive(value) {
        const next=Boolean(value);
        if(next===active || destroyed)return;
        active=next;if(active){render();start();}else stop();
      },
      resize,
      setReducedMotion(value) {reducedMotion=Boolean(value);if(reducedMotion){stop();pulseAt=-100;}else start();render();},
      destroy() {destroyed=true;stop();document.removeEventListener('visibilitychange',visibility);ctx.clearRect(0,0,canvas.width,canvas.height);}
    };
  };
})();
