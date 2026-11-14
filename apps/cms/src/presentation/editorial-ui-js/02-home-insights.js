  const homeTopicMap = () => {
    const items = [
      ['Kết hôn','Heiraten','hon-nhan-gia-dinh',24,18,'large'],
      ['Quốc tịch','Staatsangehörigkeit','quoc-tich',62,15,'large'],
      ['Giấy tờ cá nhân','Persönliche Dokumente','giay-to-tuy-than',85,34,'small'],
      ['Mua bán nhà đất','Immobilien kaufen','nha-o-dat-dai',15,39,'small'],
      ['Cư trú tại Đức','Aufenthalt in Deutschland','xuat-nhap-canh-cu-tru',38,42,'large'],
      ['Hợp đồng','Verträge','hop-dong-giao-dich-dan-su',77,59,'large'],
      ['Thừa kế','Erben','thua-ke',15,77,'small'],
      ['Đi làm','Arbeiten','lao-dong-viec-lam-bhxh',33,86,'small'],
      ['Khai sinh cho con','Geburt eines Kindes','khai-sinh-ho-tich-giam-ho',56,79,'medium'],
      ['Kinh doanh','Unternehmen gründen','dau-tu-kinh-doanh-thuong-mai',82,87,'small'],
      ['Thuế','Steuern','thue',91,68,'small']
    ];
    return `<section class="pm-topic-map" aria-labelledby="pm-topic-map-title"><div class="container"><header><h2 id="pm-topic-map-title">${l('Pháp luật trong đời sống','Recht im Alltag')}</h2></header><div class="pm-topic-network">
      <svg class="pm-network-lines" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">${items.map(item => `<path d="M500 260 L${item[3]*10} ${item[4]*5}"/>`).join('')}</svg>
      ${items.map(([vi,de,id,x,y,size]) => `<a class="pm-network-node pm-network-node--${size}" style="--node-x:${x}%;--node-y:${y}%" href="#/chu-de/${id}"><span>${l(vi,de)}</span><span class="pm-network-arrow" aria-hidden="true">↗</span></a>`).join('')}
    </div></div></section>`;
  };
  let disposeTopicNetwork = null;
  let currentTopicNetwork = null;
  function initTopicNetwork() {
    const root = document.querySelector('.pm-topic-network');
    if (root === currentTopicNetwork) return;
    disposeTopicNetwork?.();
    currentTopicNetwork = root;
    disposeTopicNetwork = null;
    if (!root) return;
    const nodes = [...root.querySelectorAll('.pm-network-node')];
    const svg = root.querySelector('.pm-network-lines');
    const paths = [...svg.querySelectorAll('path')];
    const mobile = matchMedia('(max-width: 600px)');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0, height = 0, bounds, pointer = null, visible = false, frame = 0, previous = 0, elapsed = 0;
    let focus = null, driftFocus = null, entered = 0, disposed = false;
    const entries = nodes.map(node => ({node, x:parseFloat(node.style.getPropertyValue('--node-x'))/100, y:parseFloat(node.style.getPropertyValue('--node-y'))/100, leanX:{value:0,velocity:0}, leanY:{value:0,velocity:0},w:0,h:0}));
    const spring = (state, target, rate, dt) => {
      const distance = state.value-target;
      const momentum = state.velocity+rate*distance;
      const decay = Math.exp(-rate*dt);
      state.value = target+(distance+momentum*dt)*decay;
      state.velocity = (state.velocity-rate*momentum*dt)*decay;
      return state.value;
    };
    function measure() {
      bounds=root.getBoundingClientRect();width=root.clientWidth;height=root.clientHeight;
      svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
      entries.forEach(item=>{item.w=item.node.offsetWidth;item.h=item.node.offsetHeight;});
    }
    function render(now) {
      frame=0;
      if(disposed||!visible||document.hidden||mobile.matches)return;
      const dt=previous?Math.min((now-previous)/1000,.05):0;
      previous=now;elapsed+=dt;
      const target=pointer||{x:width/2,y:height/2};
      if(!focus)focus={x:{value:target.x,velocity:0},y:{value:target.y,velocity:0}};
      if(!driftFocus)driftFocus={x:{value:target.x,velocity:0},y:{value:target.y,velocity:0}};
      const fx=spring(focus.x,target.x,1.58/.38,dt),fy=spring(focus.y,target.y,1.58/.38,dt);
      const px=spring(driftFocus.x,target.x,39.5,dt),py=spring(driftFocus.y,target.y,39.5,dt);
      entered+=(Number(Boolean(pointer))-entered)*Math.min(1,dt*19.75);
      const still=motion.matches;
      const centerX=width/2+(still?0:14*(.8*Math.sin(.9*elapsed)+.2*Math.sin(2.1*elapsed+1.3)));
      const centerY=height*.52+(still?0:14*(.6*Math.sin(.7*elapsed+2.1)+.15*Math.sin(1.7*elapsed)));
      entries.forEach((item,index)=>{
        let x=item.x*width+(still?0:Math.sin(1.1*elapsed*.35+index*2.39996)*11),y=item.y*height;
        const distance=Math.hypot(x-fx,y-fy);
        const attention=still?1:Math.exp(-Math.pow(distance/220,2));
        const scale=still?1:(16+17*attention)/33;
        const dx=px-x,dy=py-y,away=Math.hypot(dx,dy)||1;
        const proximity=still?0:entered*Math.exp(-Math.pow(Math.hypot(Math.max(0,Math.abs(dx)-item.w*scale/2),Math.max(0,Math.abs(dy)-item.h*scale/2))/96,2));
        const pull=Math.min(20,away*.15)*proximity;
        x+=spring(item.leanX,dx/away*pull,4740/320,dt);
        y+=spring(item.leanY,dy/away*pull,4740/320,dt);
        x=Math.max(item.w*scale/2+8,Math.min(width-item.w*scale/2-8,x));
        y=Math.max(item.h*scale/2+8,Math.min(height-item.h*scale/2-8,y));
        const focused=item.node.matches(':focus-visible');
        item.node.style.left=x+'px';item.node.style.top=y+'px';
        item.node.style.transform=`translate(-50%,-50%) scale(${focused?1:scale})`;
        item.node.style.opacity=focused?'1':String(still?1:.36+.64*attention);
        const lineX=x-centerX,lineY=y-centerY,length=Math.hypot(lineX,lineY)||1;
        const ux=lineX/length,uy=lineY/length;
        const gap=Math.min(ux?(item.w*scale/2+6)/Math.abs(ux):Infinity,uy?(item.h*scale/2+6)/Math.abs(uy):Infinity);
        paths[index].setAttribute('d',gap>=length?'':`M${centerX.toFixed(1)} ${centerY.toFixed(1)}L${(x-ux*gap).toFixed(1)} ${(y-uy*gap).toFixed(1)}`);
      });
      if(!still)frame=requestAnimationFrame(render);
    }
    function start(){if(!frame&&!disposed&&visible&&!document.hidden&&!mobile.matches){previous=0;frame=requestAnimationFrame(render);}}
    function stop(){cancelAnimationFrame(frame);frame=0;previous=0;}
    function change(){stop();measure();if(mobile.matches)entries.forEach(({node})=>{node.style.removeProperty('left');node.style.removeProperty('top');node.style.removeProperty('transform');node.style.removeProperty('opacity');});else start();}
    function move(event){if(event.pointerType==='touch')return;pointer={x:event.clientX-bounds.left,y:event.clientY-bounds.top};start();}
    function leave(){pointer=null;start();}
    function scroll(){bounds=root.getBoundingClientRect();}
    function visibility(){if(document.hidden)stop();else start();}
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)start();else stop();});
    const resize=new ResizeObserver(change);
    root.addEventListener('pointermove',move);root.addEventListener('pointerleave',leave);root.addEventListener('focusin',start);
    window.addEventListener('scroll',scroll,{passive:true});document.addEventListener('visibilitychange',visibility);
    mobile.addEventListener('change',change);motion.addEventListener('change',change);
    measure();observer.observe(root);resize.observe(root);document.fonts?.ready.then(()=>{if(!disposed)change();});
    disposeTopicNetwork=()=>{disposed=true;stop();observer.disconnect();resize.disconnect();root.removeEventListener('pointermove',move);root.removeEventListener('pointerleave',leave);root.removeEventListener('focusin',start);window.removeEventListener('scroll',scroll);document.removeEventListener('visibilitychange',visibility);mobile.removeEventListener('change',change);motion.removeEventListener('change',change);};
  }
