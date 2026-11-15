export const types = {edge:'Edge gateway',service:'Application',database:'Database',cache:'Cache',worker:'Worker',storage:'Storage'};
export const initialNodes = [
{id:'edge',name:'Edge gateway',type:'edge',x:-5,z:0,region:'Global edge'},
{id:'api',name:'Core API',type:'service',x:-1.2,z:0,region:'US West · zone a'},
{id:'auth',name:'Identity',type:'service',x:-1.2,z:-4.4,region:'US West · zone b'},
{id:'db',name:'Primary database',type:'database',x:3.5,z:-4.4,region:'US West · zone a'},
{id:'cache',name:'Redis cache',type:'cache',x:3.5,z:0,region:'US West · zone b'},
{id:'worker',name:'Job worker',type:'worker',x:-1.2,z:4.2,region:'US West · zone b'},
{id:'storage',name:'Object storage',type:'storage',x:3.5,z:4.2,region:'US West · zone a'}];
export const initialLinks=[['edge','api'],['api','auth'],['api','db'],['api','cache'],['api','worker'],['worker','storage']];
export const requestPath=['edge','api','auth','api','cache','api','db'];
export function metric(id,tick,fault){const seed=[...id].reduce((n,c)=>n+c.charCodeAt(0),0); return {load:fault?96:Math.round(25+Math.sin(tick*.5+seed)*12+seed%24),latency:fault?428:12+seed%21+Math.round(4*Math.sin(tick+seed)),status:fault?'Degraded':'Healthy'};}
export function addComponent(nodes,links,type){if(!types[type]) throw new Error('Unknown component'); const id=`${type}-${nodes.length+1}`;return {nodes:[...nodes,{id,type,name:`${types[type]} ${nodes.length+1}`,x:-5+(nodes.length-7)%3*4,z:8+Math.floor((nodes.length-7)/3)*3.5,region:'Local sandbox'}],links:[...links,['api',id]],id};}
