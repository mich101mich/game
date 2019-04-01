!function(e){var t={};function s(i){if(t[i])return t[i].exports;var o=t[i]={i:i,l:!1,exports:{}};return e[i].call(o.exports,o,o.exports,s),o.l=!0,o.exports}s.m=e,s.c=t,s.d=function(e,t,i){s.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:i})},s.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},s.t=function(e,t){if(1&t&&(e=s(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var i=Object.create(null);if(s.r(i),Object.defineProperty(i,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)s.d(i,o,function(t){return e[t]}.bind(null,o));return i},s.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return s.d(t,"a",t),t},s.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},s.p="",s(s.s=0)}([function(e,t,s){"use strict";var i,o;s.r(t),function(e){e[e.UP=0]="UP",e[e.RIGHT=1]="RIGHT",e[e.DOWN=2]="DOWN",e[e.LEFT=3]="LEFT",e[e.NONE=4]="NONE"}(i||(i={}));class r{constructor(e,t){this.set(e,t)}set(e=0,t=0){if(!(e instanceof r))return this.x=e,void(this.y=t);let s;s=this instanceof l?e.toGamePos():this instanceof n?e.toTilePos():e,this.x=s.x,this.y=s.y}move(e,t=1){return this.x+=r.deltaX[e]*t,this.y+=r.deltaY[e]*t,this}equals(e){return this.x===e.x&&this.y===e.y}dirTo(e){return e.x>this.x?i.RIGHT:e.x<this.x?i.LEFT:e.y>this.y?i.DOWN:i.UP}xy(){return[this.x,this.y]}toString(){return"("+this.x+", "+this.y+")"}toTilePos(){return new n(this.x,this.y)}toGamePos(){return new l(this.x,this.y)}}r.deltaX=[0,1,0,-1,0],r.deltaY=[-1,0,1,0,0];class n extends r{isValid(){return this.x>=0&&this.y>=0&&this.x<C.TILE_WIDTH&&this.y<C.TILE_HEIGHT}plus(e,t=0){return e instanceof n?new n(this.x+e.x,this.y+e.y):new n(this.x+e,this.y+t)}minus(e,t=0){return e instanceof n?new n(this.x-e.x,this.y-e.y):new n(this.x-e,this.y-t)}scale(e){return new n(this.x*e,this.y*e)}toTilePos(){return this}getInDir(e){return new n(this).move(e)}toGamePos(){const e=this.scale(C.cellSize);return new l(e.x,e.y)}distance(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}mid(){return this.plus(.5,.5).toGamePos()}}class l extends r{isValid(){return this.x>=0&&this.y>=0&&this.x<C.GAME_WIDTH&&this.y<C.GAME_HEIGHT}plus(e,t=0){return e instanceof l?new l(this.x+e.x,this.y+e.y):new l(this.x+e,this.y+t)}minus(e,t=0){return e instanceof l?new l(this.x-e.x,this.y-e.y):new l(this.x-e,this.y-t)}scale(e){return new l(this.x*e,this.y*e)}distance(e){return Math.sqrt(Math.pow(this.x-e.x,2)+Math.pow(this.y-e.y,2))}floor(){return new l(Math.floor(this.x),Math.floor(this.y))}toTilePos(){const e=this.scale(1/C.cellSize).floor();return new n(e.x,e.y)}toGamePos(){return this}}class a{constructor(e,t,s=0,o=i.NONE){this.start=new n(e),this.end=new n(t),this.length=s,this.next=o}static generate(e,t){if(e.x==t.x&&e.y==t.y)return new a(e,t,0);if(!e.isValid()||!t.isValid())return null;let s=C.wasm.find_path(e.x,e.y,t.x,t.y);if(s<0)return null;const i=3&s;return new a(e,t,s>>=2,i)}static gen_all(e,t,s){if(0==t.length)return[];const i=t.map(e=>({obj:e,end:s(e)}));for(const{end:e}of i)C.wasm.add_flood_goal(e.x,e.y);C.wasm.flood_search(e.x,e.y);const o=i.map(({obj:t,end:s})=>{let i=C.wasm.flood_path_to(s.x,s.y);if(i<0)return null;const o=3&i;return{obj:t,path:new a(e,s,i>>=2,o)}}).filter(e=>null!=e);return C.wasm.end_flood_search(),o}static best(e,t,s,i){const o=this.gen_all(e,t,s).min(e=>i(e.obj,e.path.length));return o?o.obj:null}static nearest(e,t,s){for(const i of t)if(s(i).equals(e))return i;return this.best(e,t,s,(e,t)=>t)}}class h{constructor(e,t,s=0,i=0){e instanceof l?t instanceof l?(this.x=Math.min(e.x,t.x),this.width=Math.max(e.x,t.x)-this.x,this.y=Math.min(e.y,t.y),this.height=Math.max(e.y,t.y)-this.y):(this.x=e.x,this.y=e.y,this.width=s,this.height=i):(this.x=e,this.y=t,this.width=s,this.height=i)}get left(){return this.x}get top(){return this.y}get right(){return this.x+this.width}get bottom(){return this.y+this.height}leftTop(){return new l(this.left,this.top)}rightBottom(){return new l(this.right,this.bottom)}contains(e){return e.x>=this.left&&e.y>=this.top&&e.x<this.right&&e.y<this.bottom}intersects(e){return this.left<e.right&&e.left<this.right&&this.top<e.bottom&&e.top<this.bottom}}!function(e){e[e.Ore=0]="Ore",e[e.Crystal=1]="Crystal"}(o||(o={}));class c{constructor(e,t,s=null){this.worker=null,this.type=t,this.pos=e,this.request=s}exists(){return C.items.contains(this)}remove(){this.worker&&(this.worker.item=null,this.worker=null),this.request&&(this.request.removeItem(this),this.request=null),C.items.remove(this),C.menu.remove(this)}draw(e){const t=u[this.type];e.fillStyle=t.color,e.beginPath(),e.ellipse(this.pos.x,this.pos.y,t.size,t.size,0,2*Math.PI,0),e.fill()}getOutline(){const e=u[this.type];return new h(this.pos.x-e.size/2,this.pos.y-e.size/2,e.size,e.size)}getOptionMenu(e){return[]}getDescription(){return`Item(${o[this.type]})`}getInfo(){return""}}const u=[{size:2,color:"brown"},{size:2,color:"lime"}];class m{constructor(e){this.amount=new Map,e instanceof m?e.amount.forEach((e,t)=>this.amount.set(t,e)):(e.ore&&this.amount.set(o.Ore,e.ore),e.crystal&&this.amount.set(o.Crystal,e.crystal))}display(){return 0==this.amount.size?"":"("+[...this.amount.entries()].map(([e,t])=>t+" "+o[e]).join(", ")+")"}isAvailable(){for(const[e,t]of this.amount)if(C.resources.get(e)<t)return!1;return!0}pay(){this.amount.forEach((e,t)=>{C.resources.remove(t,e)})}request(e){C.items.request(e,this)}remove(e,t=1){let s=this.amount.get(e);if(void 0==s)throw new Error("Attempt to remove non-available ItemType "+o[e]+" from "+this);0==(s=Math.max(0,s-t))?this.amount.delete(e):this.amount.set(e,s)}isDone(){return 0==this.amount.size}}class d{get pos(){return this._pos}constructor(e,t,s,i=(()=>!0)){this._pos=e,this.range=t.range||0,this.duration=t.duration,this.priority=t.priority||0,this.worker=void 0,this.resolve=s,this.checkValid=i}hasWorker(){return void 0!==this.worker}isValid(){return this.checkValid(this.worker)}work(){if(!this.worker)throw new Error("Job worked without Worker");if(!this.isValid())return void this.remove();if(this.duration>0)return void this.duration--;const e=this.worker;this.remove(),this.resolve(e)}remove(){this.worker&&(this.worker.job=null,this.worker=void 0),C.jobs.remove(this)}}class p extends d{constructor(e){super(e.pos.toTilePos(),{duration:0,priority:e.request?e.request.priority:0},t=>{t.pickUp(e),t.setJob(null)},t=>null==e.worker&&e.exists()&&(!t||null==t.item))}}class f extends d{constructor(e){const t=e.type;super(e.pos,{range:1,duration:Math.max(1,e.getStrength()-2*C.drillSpeed)},()=>e.remove(),()=>e.type==t)}}class y extends d{constructor(e,t=4){const s=e.type;super(e.pos,{range:0,priority:t,duration:Math.max(1,e.getStrength()-2*C.drillSpeed)},()=>e.remove(),()=>e.type==s)}}var w;!function(e){e[e.Air=0]="Air",e[e.Bedrock=1]="Bedrock",e[e.Granite=2]="Granite",e[e.Rock=3]="Rock",e[e.Ore=4]="Ore",e[e.Crystal=5]="Crystal",e[e.Debris=6]="Debris",e[e.Platform=7]="Platform",e[e.Machine=8]="Machine"}(w||(w={}));class g{constructor(e){this.pos=new n(e),this.rect=new h(this.pos.toGamePos(),this.pos.plus(1,1).toGamePos())}get type(){return C.wasm.get(this.pos.x,this.pos.y)}getData(){return b[this.type]}getStrength(){return this.getData().strength}isSolid(){return C.wasm.is_solid(this.pos.x,this.pos.y)}getWalkCost(){return C.wasm.walk_cost(this.pos.x,this.pos.y)}isVisible(){return C.wasm.is_visible(this.pos.x,this.pos.y)}isSelectable(){return this.getData().selectable}isDrillable(){const e=this.getData().drillLevel;return void 0!==e&&e<=C.drillLevel}remove(){const e=this.getData().drops||[];for(const t of e)if(Math.random()<t.probability){const e=this.pos.mid().plus(12*Math.random()-6,12*Math.random()-6);C.items.create(e,t.item)}this.getData().leavesDebris?(C.place(this.pos,w.Debris),C.jobs.add(new y(this))):C.place(this.pos,w.Air)}getOutline(){return this.rect}getDescription(){return`${w[this.type]}`}getInfo(){return""}getOptionMenu(e){let t=[];return this.isDrillable()?t.push({name:"Mark for Drill",callback:()=>{for(const t of e)t.type==w.Debris?C.jobs.add(new y(t,0)):C.jobs.add(new f(t));return!0},hotkeys:["d"]}):this.type==w.Air&&S.map((e,t)=>({data:e,type:t})).filter(e=>e.data.buildable).map(t=>({name:"Build "+k[t.type],callback:()=>{for(const s of e)D.constructMachine(s.pos,t.type);return!0},hotkeys:[]})).forEach(e=>t.push(e)),t}static at(e,t=0){return e instanceof n||(e=new n(e,t)),e.isValid()?(g.tiles[e.x]||(g.tiles[e.x]=[]),g.tiles[e.x][e.y]||(g.tiles[e.x][e.y]=new g(e)),g.tiles[e.x][e.y]):null}}g.tiles=[];const b=[{name:"Air",strength:-1,selectable:!0,leavesDebris:!1},{name:"Bedrock",strength:-1,selectable:!1,leavesDebris:!1},{name:"Granite",strength:20,drillLevel:1,selectable:!0,leavesDebris:!0,drops:[{item:o.Ore,probability:.1},{item:o.Crystal,probability:.05}]},{name:"Stone",strength:4,drillLevel:0,selectable:!0,leavesDebris:!0,drops:[{item:o.Ore,probability:.2},{item:o.Crystal,probability:.05}]},{name:"Ore",strength:7,drillLevel:0,selectable:!0,leavesDebris:!0,drops:[{item:o.Ore,probability:1},{item:o.Ore,probability:1},{item:o.Ore,probability:.25},{item:o.Ore,probability:.1}]},{name:"Crystal",strength:6,drillLevel:0,selectable:!0,leavesDebris:!0,drops:[{item:o.Crystal,probability:1},{item:o.Crystal,probability:1},{item:o.Crystal,probability:.3},{item:o.Crystal,probability:.1}]},{name:"Debris",strength:5,drillLevel:0,selectable:!0,leavesDebris:!1,drops:[{item:o.Ore,probability:1},{item:o.Ore,probability:.1}]},{name:"Platform",strength:-1,selectable:!1,leavesDebris:!0},{name:"Machine",strength:-1,selectable:!1,leavesDebris:!1}],v=3;class x{constructor(e){this.moveDelay=0,this.totalMoveDelay=0,this.pos=new n(e),this.job=null,this.item=null}tick(){if(this.moveDelay>0){if(this.moveDelay--,0!=this.moveDelay)return;this.pos.move(this.moveDirection),this.item&&(this.item.pos=this.pos.mid())}let e=null;if(!this.job&&this.item){if(!this.item.request)return void this.dropItem();if(this.pos.distance(this.item.request.target.pos)<=1)return void this.item.request.deliverItem(this.item);e=a.generate(this.pos,this.item.request.target.pos)}else this.job||(e=this.findJob());if(this.job){if(this.pos.distance(this.job.pos)<=this.job.range)return void this.job.work();e||(e=a.generate(this.pos,this.job.pos))}if(!e)return this.setJob(null),void this.dropItem();this.moveDirection=e.next,this.moveDelay=this.totalMoveDelay=g.at(this.pos).getWalkCost(),this.pathLen=e.length}findJob(){if(this.item)return null;let e=a.gen_all(this.pos,[...C.jobs],e=>e.pos).filter(e=>null==e.obj.worker||e.obj.worker.pathLen>e.path.length+1).map(({obj:e,path:t})=>({obj:e,rating:t.length+10*e.priority,path:t})).min(e=>e.rating);return e?(this.setJob(e.obj,e.path.length),e.path):null}setJob(e,t=-1){if(this.job&&(this.job.worker=void 0),this.job=e,e)if(e.worker&&(e.worker.job=null),e.worker=this,-1==t){const t=a.generate(this.pos,e.pos);this.pathLen=t?t.length:0}else this.pathLen=t}busy(){return null!=this.job||null!=this.item}pickUp(e){this.item&&(this.item.worker=null),this.item=e,e&&(e.worker=this,e.pos=this.pos.mid())}dropItem(){this.item&&(this.item.worker=null,this.item.request&&this.item.request.removeItem(this.item)),this.item=null}remove(){this.job&&(this.job.worker=void 0,this.job=null),C.workers.remove(this),C.menu.remove(this)}draw(e){e.fillStyle="red";const t=this.getOutline();if(this.moveDelay>0){const s=1-this.moveDelay/this.totalMoveDelay+1/this.totalMoveDelay*C.subTickProgress,i=this.pos.toGamePos(),o=this.pos.getInDir(this.moveDirection).toGamePos().minus(i).scale(s);e.fillRect(t.x+o.x,t.y+o.y,t.width,t.height),this.item&&(this.item.pos=this.pos.mid().plus(o.x,o.y))}else e.fillRect(t.x,t.y,t.width,t.height)}getOutline(){const e=this.pos.toGamePos().plus(v,v),t=e.plus(C.cellSize-2*v,C.cellSize-2*v);return new h(e,t)}getDescription(){return"Worker"}getInfo(){let e="";return this.item&&(e+="Carrying: "+this.item.getDescription()+"\n"),this.moveDelay&&(e+="Walk Delay: "+this.moveDelay+"\n"),e}getOptionMenu(e){return[{name:"Destroy",callback:()=>(e.forEach(e=>e.remove()),!0),hotkeys:["backspace","delete"]}]}}var k;!function(e){e[e.Spawn=0]="Spawn",e[e.Lab=1]="Lab",e[e.ConstructionSite=2]="ConstructionSite",e[e.Platform=3]="Platform"}(k||(k={}));const S=[{cost:new m({ore:5,crystal:1}),buildable:!0},{cost:new m({ore:15,crystal:3}),buildable:!0},{cost:new m({}),buildable:!1},{cost:new m({ore:2}),buildable:!0}];class D{constructor(e,t,s={}){if(this.cooldown=0,this.power=!1,this.level=0,this.levelupCost=new m({ore:5}),this.pos=new n(e),this.type=t,this.options=s,this.rect=new h(this.pos.x*C.cellSize,this.pos.y*C.cellSize,C.cellSize,C.cellSize),t==k.Spawn){const e=new m({ore:1/0,crystal:1/0});C.items.request(this,e,100)}else t==k.ConstructionSite&&s.cost&&s.cost.request(this);t==k.Spawn?(C.resources.get(o.Crystal)>0&&this.setPower(!0),C.resources.addListener(this)):this.neighborMachines().find(e=>e.power)&&this.setPower(!0),t==k.Platform?C.place(e,w.Platform):C.place(e,w.Machine)}tick(){this.cooldown>0&&(this.cooldown--,0==this.cooldown&&this.options.workDone&&(this.options.workDone(),delete this.options.workDone))}freeNeighbor(){for(let e=0;e<4;e++){const t=new n(this.pos);if(t.move(e),!g.at(t).isSolid())return t}return null}neighborMachines(){return[i.UP,i.RIGHT,i.DOWN,i.LEFT].map(e=>new n(this.pos).move(e)).map(e=>C.machines.at(e)).filter(e=>e)}requestedItemDelivered(e){this.type==k.Spawn&&C.resources.add(e)}requestComplete(){this.type==k.ConstructionSite&&(delete this.options.cost,this.cooldown=5,this.options.workDone=(()=>{const e=this.options.result||k.Spawn;delete this.options.result,this.remove(),C.machines.add(new D(this.pos,e,this.options))}))}givesPower(){return this.type==k.Spawn&&C.resources.get(o.Crystal)>0}conducts(){return this.type!=k.ConstructionSite}setPower(e){if(this.power==e)return;if(this.givesPower()&&!e)return;let t=this.neighborMachines().filter(e=>e.conducts());if(!e&&t.find(e=>e.givesPower()))return this.power=!0,void t.forEach(e=>{e.power||e.setPower(!0)});this.power=e;for(const s of t)if(s.setPower(e),this.power!=e)return}onAdd(e,t,s){e==o.Crystal&&this.type==k.Spawn&&0==t&&this.setPower(!0)}onRemove(e,t,s){e==o.Crystal&&this.type==k.Spawn&&0==s&&this.setPower(!1)}ready(){return 0==this.cooldown&&this.power}remove(){if(C.resources.removeListener(this),g.at(this.pos).remove(),C.machines.remove(this),C.menu.remove(this),this.power)for(const e of this.neighborMachines())e.conducts()&&e.setPower(!1)}draw(e){e.drawImage(C.assets,16*this.type,16,16,16,this.rect.x,this.rect.y,this.rect.width,this.rect.height),!this.power&&this.conducts()&&(e.fillStyle="rgba(0,0,0,0.3)",e.fillRect(this.rect.x,this.rect.y,this.rect.width,this.rect.height))}getOutline(){return this.rect}getDescription(){return`Machine(${k[this.type]})`}getInfo(){let e="";return this.type!=k.ConstructionSite&&(e+=`\nLevel: ${this.level+1}`),this.type==k.ConstructionSite&&this.options.cost&&(e+="Requires: "+this.options.cost.display()),this.cooldown&&(e+="\nWork done in "+this.cooldown),e}getOptionMenu(e){const t=[{name:"Destroy",callback:()=>(this.remove(),!0),hotkeys:["backspace","delete"]}];return this.type!=k.ConstructionSite&&t.unshift({name:"Level up "+this.levelupCost.display(),callback:()=>(this.levelupCost.pay(),this.options.workDone=(()=>this.level++),this.cooldown=4*(this.level+2),this.levelupCost.amount.set(o.Ore,5*(this.level+2)),!1),enabled:()=>this.ready()&&this.levelupCost.isAvailable(),hotkeys:["u","+"]}),this.type==k.Spawn?t.unshift({name:"Spawn Worker",callback:()=>(this.options.workDone=(()=>{const e=this.freeNeighbor();e?C.workers.add(new x(e)):alert("Unable to spawn Worker: No free space near Spawn!")}),this.cooldown=Math.max(5,20-2*this.level),!1),enabled:()=>this.ready()&&C.workers.hasRoom()&&null!=this.freeNeighbor(),hotkeys:["s"]}):this.type==k.Lab&&M.filter(e=>e.available()).map(e=>({name:e.name+"\n"+e.cost.display(),callback:()=>(e.cost.pay(),this.cooldown=Math.max(5,e.time-5*this.level),this.options.workDone=e.onResearched,e.costIncrease&&(e.cost=e.costIncrease(e.cost)),!1),enabled:()=>this.ready()&&e.cost.isAvailable()&&e.available(),hotkeys:[]})).forEach(e=>t.push(e)),t}static constructMachine(e,t){C.isFree(e)&&C.machines.add(new D(e,k.ConstructionSite,{cost:new m(S[t].cost),result:t}))}static debugMode(){for(const e of M)for(let t=0;t<20;t++)e.available()&&(e.onResearched(),e.costIncrease&&(e.cost=e.costIncrease(e.cost)))}}const M=[{name:"+Drill Level",cost:new m({ore:100,crystal:20}),time:100,onResearched:()=>{C.drillLevel++},available:()=>C.drillLevel<2,costIncrease:e=>{for(const[t,s]of e.amount)e.amount.set(t,2*s);return e}},{name:"+Drill Speed",cost:new m({ore:20}),time:20,onResearched:()=>{C.drillSpeed++},available:()=>!0,costIncrease:e=>new m({ore:e.amount.get(o.Ore)+20})},{name:"+Worker Capacity",cost:new m({crystal:10}),time:50,onResearched:()=>{C.workers.capacity+=10},available:()=>!0,costIncrease:e=>new m({crystal:2*e.amount.get(o.Crystal)})},{name:"+Game Speed",cost:new m({ore:100,crystal:20}),time:100,onResearched:()=>{C.gameSpeed-=20},available:()=>C.gameSpeed>40,costIncrease:e=>{for(const[t,s]of e.amount)e.amount.set(t,2*s);return e}}];class E{constructor(e){this.list=new Set,this.capacity=e||1/0}[Symbol.iterator](){return this.list[Symbol.iterator]()}get count(){return this.list.size}hasRoom(){return this.count<this.capacity}contains(e){return this.list.has(e)}add(e){if(!this.hasRoom())return!1;const t=this.count;return this.list.add(e).size>t}remove(e){return this.list.delete(e)}}class P{constructor(e,t,s=0){this.target=e,this.priority=s,this.cost=t,this.items=[],this.cost.amount.forEach((e,t)=>{this.requestItem(t,e)})}requestItem(e,t){const s=[...C.items].filter(t=>t.type==e).filter(e=>null==e.request||e.request.priority>=this.priority);let i=[];this.priority<100&&C.resources.get(e)>0&&(i=C.machines.spawns().filter(e=>null!=e.freeNeighbor()));const o=i.concat(s);if(0==o.length)return void C.items.unresolved.push({request:this,type:e,amount:t});const r=a.gen_all(this.target.pos,o,e=>e.pos.toTilePos()).sort((e,t)=>e.path.length-t.path.length);for(;t>0&&r.length>0;){const s=r[0].obj;let i;if(s instanceof D){if(!(i=C.resources.spawnItem(e,this,s))){r.removeAt(0);continue}}else{if(s.request){const e=a.generate(s.pos.toTilePos(),s.request.target.pos);if(e&&r[0].path.length>e.length+10*(s.request.priority-this.priority)){r.removeAt(0);continue}s.request.items.remove(s)}i=s,r.removeAt(0)}i.request=this,C.jobs.add(new p(i)),t--}0!=t&&C.items.unresolved.push({request:this,type:e,amount:t})}deliverItem(e){this.cost.remove(e.type),this.target.requestedItemDelivered(e.type),this.items.remove(e),e.remove(),this.cost.isDone()&&(C.items.requests.remove(this),this.target.requestComplete())}removeItem(e){this.items.remove(e)&&this.requestItem(e.type,1)}}var T;!function(e){e[e.Default=0]="Default",e[e.TileBrush=1]="TileBrush",e[e.WorkerSelection=2]="WorkerSelection",e[e.PlacePlatform=3]="PlacePlatform"}(T||(T={}));class I{constructor(e,t){this.brushSize=30,this.zoom=1,this.mouseMode=T.Default,this.eventRelevant=!1,this.hasMoved=!1,this.startPos=new l(0,0),this.selection=new Set,this.mouse=new l(0,0),this.rawMouse=new l(0,0),this.mouseDown=!1,this.element=e,this.onNewSelection=t;const s=new l(C.GAME_WIDTH,C.GAME_HEIGHT).scale(.5),i=new l(C.SCREEN_WIDTH,C.SCREEN_HEIGHT).scale(.5);this.offset=i.minus(s),document.addEventListener("keydown",e=>{this.updateKeys(e),"Escape"==e.key&&(this.selection.clear(),this.onNewSelection(this.selection),this.eventRelevant=!1,e.preventDefault())}),document.addEventListener("keyup",e=>this.updateKeys(e)),document.addEventListener("mousedown",e=>{this.updateKeys(e),0==e.button&&(this.eventRelevant=e.target==this.element,this.handleMouseEvent(e,!0,!1))}),document.addEventListener("mousemove",e=>{this.updateKeys(e),C.getMousePos(e).equals(this.mouse)||this.handleMouseEvent(e,!1,!1)}),document.addEventListener("mouseup",e=>{this.updateKeys(e),0==e.button&&this.handleMouseEvent(e,!1,!0)}),e.addEventListener("wheel",e=>{this.updateKeys(e);const t=1-e.deltaY/1e3,s=this.element.getBoundingClientRect();this.offset.x=(e.pageX-s.left)*(1-t)+this.offset.x*t,this.offset.y=(e.pageY-s.top)*(1-t)+this.offset.y*t,this.zoom*=t,e.preventDefault()})}updateKeys(e){e.shiftKey?this.mouseMode!=T.TileBrush&&(this.mouseMode=T.TileBrush):e.ctrlKey?this.mouseMode!=T.WorkerSelection&&(this.mouseMode=T.WorkerSelection,this.mouseDown&&this.startPos.set(this.mouse)):this.mouseMode!=T.TileBrush&&this.mouseMode!=T.WorkerSelection||(this.mouseMode=T.Default,this.mouseDown&&(this.selection.clear(),this.onNewSelection(this.selection)))}handleMouseEvent(e,t,s){this.eventRelevant&&e.preventDefault();const i=C.getMousePos(e),o=C.getRawMousePos(e),r=!s&&!t;if(this.mouseDown=!s&&(t||this.mouseDown),this.hasMoved=r,t&&this.mouseMode!=T.Default&&(this.selection.clear(),this.onNewSelection(this.selection),this.startPos.set(i)),this.mouseDown&&this.eventRelevant)if(this.mouseMode==T.TileBrush)this.appendTargets(i);else if(this.mouseMode==T.PlacePlatform){const e=i.toTilePos(),t=g.at(e);t&&t.isVisible()&&C.isFree(e)&&D.constructMachine(e,k.Platform)}else if(this.mouseMode==T.Default&&r){const e=o.minus(this.rawMouse);this.offset=this.offset.plus(e)}if(s&&this.eventRelevant){if(this.mouseMode==T.WorkerSelection){const e=new h(this.startPos,i);for(const t of C.workers)e.intersects(t.getOutline())&&this.selection.add(t)}else if(this.mouseMode==T.Default&&!this.hasMoved){this.selection.clear();const e=C.getSelectableAt(i);e&&this.selection.add(e)}this.mouseMode==T.Default&&this.hasMoved||(this.onNewSelection(this.selection),this.selection.clear())}this.mouse.set(i),this.rawMouse.set(o)}appendTargets(e){if(this.mouseMode!=T.TileBrush)return;const t=e.minus(this.brushSize,this.brushSize).toTilePos(),s=e.plus(this.brushSize,this.brushSize).toTilePos();for(let i=t.x;i<=s.x;i++)for(let o=t.y;o<=s.y;o++){const t=g.at(i,o);t&&t.isVisible()&&t.isDrillable()&&t.isSelectable()&&(t.pos.mid().toGamePos().distance(e)<this.brushSize+C.cellSize/2||t.pos.toGamePos().distance(e)<this.brushSize||t.pos.plus(1,0).toGamePos().distance(e)<this.brushSize||t.pos.plus(0,1).toGamePos().distance(e)<this.brushSize||t.pos.plus(1,1).toGamePos().distance(e)<this.brushSize)&&this.selection.add(t)}}draw(e,t){e.strokeStyle="red";for(const t of this.selection){const s=t.getOutline();e.strokeRect(s.x,s.y,s.width,s.height)}if(e.fillStyle="rgba(180, 180, 255, 0.7)",e.beginPath(),this.mouseMode==T.TileBrush)e.ellipse(this.mouse.x,this.mouse.y,this.brushSize,this.brushSize,0,0,2*Math.PI);else if(this.mouseMode==T.WorkerSelection){if(this.mouseDown){const t=this.mouse.minus(this.startPos);e.rect(this.startPos.x,this.startPos.y,t.x,t.y)}}else{if(this.mouseMode==T.PlacePlatform){const s=this.mouse.toTilePos();return e.drawImage(C.assets,16*w.Platform,0,16,16,s.x*t,s.y*t,t,t),void(C.isFree(s)||(e.fillStyle="rgba(255, 0, 0, 0.5)",e.fillRect(s.x*t,s.y*t,t,t)))}{const s=this.mouse.toTilePos();e.rect(s.x*t,s.y*t,t,t)}}e.fill()}}class _{constructor(e,t=!0){this.selection=new Set,this.options=[],this.buttons=[],this.container=e,this.hasDefaultOptions=t,document.addEventListener("keydown",e=>{C.mouseHandler.updateKeys(e);const t=function(e){let t=e.key.toLowerCase();e.altKey&&(t="alt+"+t);e.metaKey&&(t="meta+"+t);e.shiftKey&&(t="shift+"+t);e.ctrlKey&&(t="ctrl+"+t);return t}(e);if(" "==t&&this.options.length>0)this.call(this.options[0]),e.preventDefault();else if(t.match(/^[1-9]$/)){const s=parseInt(t)-1;s<this.options.length&&(this.call(this.options[s]),e.preventDefault())}else for(const s of this.options)-1!=s.hotkeys.indexOf(t)&&(this.call(s),e.preventDefault())}),this.refresh()}call(e){!e||e.enabled&&!e.enabled()||(e.callback()&&this.selection.clear(),this.refresh())}refresh(){for(0==this.selection.size?this.hasDefaultOptions?this.options=function(){let e=[];C.mouseHandler.mouseMode!=T.PlacePlatform?e.push({name:"Place Platforms",callback:()=>(C.mouseHandler.mouseMode=T.PlacePlatform,!0),hotkeys:["p"]}):e.push({name:"Stop placing Platforms",callback:()=>(C.mouseHandler.mouseMode=T.Default,!0),hotkeys:["p"]});return e}():this.options=[]:this.options=this.selection.first().getOptionMenu(this.selection);this.buttons.length<this.options.length;){const e=document.createElement("tr");this.container.appendChild(e);const t=document.createElement("td");e.appendChild(t);const s=document.createElement("button"),i=this.buttons.length;s.addEventListener("click",()=>{this.call(this.options[i])}),t.appendChild(s),this.buttons.push(s)}for(;this.buttons.length>this.options.length;){this.buttons.pop();const e=this.container.children.item(this.container.childElementCount-1);e&&this.container.removeChild(e)}const e=this.container.getElementsByTagName("button");for(let t=0;t<this.options.length;t++){const s=this.options[t];let i=e[t];i.setAttribute("tooltip",[(t+1).toString()].concat(s.hotkeys).join(", ")),i.setAttribute("tooltip-position","left"),i.innerText=s.name}}draw(e){e.strokeStyle="red",this.selection.forEach(t=>{const s=t.getOutline();e.strokeRect(s.x,s.y,s.width,s.height)}),this.options.forEach((e,t)=>{!e.enabled||e.enabled()?this.buttons[t].removeAttribute("disabled"):this.buttons[t].setAttribute("disabled","")})}getInfo(){if(0==this.selection.size)return"";const e=this.selection.first();if(1==this.selection.size)return e.getDescription()+"\n"+e.getInfo();{let t={},s=e.getInfo();for(const e of this.selection){const i=e.getDescription();t[i]=(t[i]||0)+1,s!=e.getInfo()&&(s="")}let i="";for(const e in t)i+=t[e]+"x "+e+"\n";return i+s}}}const H=16;class C{static get cellSize(){return H}static init(e,t){function s(){const e=C.canvas.getBoundingClientRect();C.SCREEN_WIDTH=e.width,C.SCREEN_HEIGHT=e.height,C.canvas.width=C.SCREEN_WIDTH,C.canvas.height=C.SCREEN_HEIGHT}C.canvas=document.getElementById("canvas"),window.addEventListener("resize",s),s(),C.assets=t,C.wasm=e,C.wasm.init(C.TILE_WIDTH,C.TILE_HEIGHT),C.background=document.createElement("canvas"),C.background.width=C.GAME_WIDTH,C.background.height=C.GAME_HEIGHT,C.menu.info=document.getElementById("info"),C.mouseHandler=new I(C.canvas,e=>C.menu.onNewSelection(e));const i=document.getElementById("options");C.menu.side=new _(i);const o=document.getElementById("contextMenu");C.menu.context=new _(o,!1),C.canvas.addEventListener("click",e=>{C.menu.context.selection.clear(),C.menu.context.refresh()}),C.canvas.addEventListener("contextmenu",e=>{const t=C.getMousePos(e),s=C.getSelectableAt(t.toGamePos());t.isValid()&&e.preventDefault(),C.menu.context.container.style.left=e.pageX+"px",C.menu.context.container.style.top=e.pageY+"px",s?(C.menu.context.selection.clear(),C.menu.context.selection.add(s),C.menu.side.selection.clear()):C.menu.context.selection.clear(),C.menu.refresh()});const r=C.TILE_WIDTH/2,l=C.TILE_HEIGHT/2;C.machines.add(new D(new n(r,l),k.Spawn));for(let e=1;e<3;e++)C.machines.add(new D(new n(r,l+e),k.Platform));for(let e=1;e<5;e++)C.machines.add(new D(new n(r,l-e),k.Platform));C.machines.add(new D(new n(r-1,l-4),k.Platform));for(let e=1;e<4;e++)D.constructMachine(new n(r-e,l),k.Platform);for(let e=1;e<3;e++)C.machines.add(new D(new n(r+e,l),k.Platform));for(let e=0;e<2;e++)C.machines.add(new D(new n(r+3,l+e),k.Platform));C.machines.add(new D(new n(r+3,l+2),k.Lab)),C.workers.add(new x(new n(r-1,l-1))),C.workers.add(new x(new n(r-1,l+1))),C.workers.add(new x(new n(r,l-1))),C.workers.add(new x(new n(r,l+1))),C.workers.add(new x(new n(r+1,l-1))),C.workers.add(new x(new n(r+1,l))),C.workers.add(new x(new n(r+1,l+1))),C.resources.display=document.getElementById("resources"),C.refreshBackground(),requestAnimationFrame(C.update.bind(C))}static update(e){requestAnimationFrame(C.update.bind(C));const t=e-C.time;if(C.time=e,C.timeDebt+=t,C.timeDebt>=C.gameSpeed){C.timeDebt=0,C.subTickProgress=0;for(const e of C.workers)e.tick();for(const e of C.machines)e.tick()}else C.subTickProgress=C.timeDebt/C.gameSpeed;C.backgroundDirty&&C.refreshBackground(),C.draw()}static draw(){const e=C.canvas.getContext("2d");if(!e)throw new Error("Canvas 2d-Mode not supported");e.imageSmoothingEnabled=!1,e.setTransform(1,0,0,1,0,0),e.fillStyle="#333333",e.fillRect(0,0,C.canvas.width,C.canvas.height),e.setTransform(C.mouseHandler.zoom,0,0,C.mouseHandler.zoom,C.mouseHandler.offset.x,C.mouseHandler.offset.y),e.drawImage(C.background,0,0);for(const t of C.machines)t.draw(e);for(const t of C.workers)t.draw(e);for(const t of C.items)t.draw(e);C.menu.side.draw(e),C.menu.context.draw(e);let t="";if(C.menu.side.selection.size?t=C.menu.side.getInfo():C.menu.context.selection.size&&(t=C.menu.context.getInfo()),t&&("\n"!=t[t.length-1]&&(t+="\n"),t+="--------------------"),C.menu.info.innerText=t,C.resources.draw(),C.mouseHandler.draw(e,H),C.debugDisplayActive){const t=C.mouseHandler.mouse.toTilePos();e.setTransform(1,0,0,1,0,0);const s=e.font.split(" "),i=s[s.length-1];e.font=H+"px "+i;const o=e.measureText(Math.max(t.x,t.y).toString()).width;e.fillStyle="black",e.fillRect(0,0,o+8,2*H+8),e.fillStyle="white",e.fillRect(2,2,o+4,2*H+4),e.strokeStyle="black",e.strokeText(t.x.toString(),4,H+2),e.strokeText(t.y.toString(),4,2*H+2)}}static refreshBackground(){C.backgroundDirty=!1;const e=C.background.getContext("2d");if(!e)throw new Error("Canvas 2d-Mode not supported");e.fillStyle="black",e.fillRect(0,0,C.GAME_WIDTH,C.GAME_HEIGHT),e.fillStyle="white";const t=new n(0,0);for(t.y=0;t.y<C.TILE_HEIGHT;t.y++)for(t.x=0;t.x<C.TILE_WIDTH;t.x++)if(C.wasm.is_visible(t.x,t.y)){e.fillRect(t.x*H,t.y*H,H,H);const s=C.wasm.get(t.x,t.y);if(C.wasm.get(t.x,t.y)==w.Platform){const s=[0,1,2,3].map(e=>{const s=t.getInDir(e);if(!s.isValid())return!1;const i=C.wasm.get(s.x,s.y);return i==w.Platform||i==w.Machine}).map(e=>e?1:0).reduceRight((e,t)=>e<<1|t,0);e.drawImage(C.assets,16*s,32,16,16,t.x*H,t.y*H,H,H)}else e.drawImage(C.assets,16*s,0,16,16,t.x*H,t.y*H,H,H)}if(C.debugDisplayActive){e.strokeStyle="red",e.beginPath();const t=C.wasm.chunk_size();for(let s=0;s<C.TILE_HEIGHT;s+=t)e.moveTo(0,s*H),e.lineTo(C.GAME_WIDTH,s*H);for(let s=0;s<C.TILE_WIDTH;s+=t)e.moveTo(s*H,0),e.lineTo(s*H,C.GAME_HEIGHT);e.stroke();const s=["black"];for(let e=1;e<4*t;e++){let i=e/(4*t);s.push("rgb("+255*i+", "+(255-255*i)+", 0)")}C.wasm.iter_links();do{const t=C.wasm.link_x(),i=C.wasm.link_y(),o=C.wasm.link_id(),r=g.at(t,i).getOutline();e.strokeStyle="red",e.strokeRect(r.x+1,r.y+1,r.width-2,r.height-2);do{const o=C.wasm.connection_x(),r=C.wasm.connection_y(),n=C.wasm.connection_cost();e.strokeStyle=s[n],e.beginPath(),e.moveTo((t+.5)*H,(i+.5)*H);const l=(t+.5+(o+.5))/2,a=(i+.5+(r+.5))/2;e.lineTo(l*H,a*H),e.stroke()}while(C.wasm.next_connection());e.strokeStyle="blue",e.strokeText(o.toString(),r.left,r.bottom)}while(C.wasm.next_link())}}static place(e,t){C.wasm.set(e.x,e.y,t),C.wasm.set_visible(e.x,e.y),C.backgroundDirty=!0;const s=g.at(e);C.mouseHandler.selection.delete(s),C.menu.side.selection.delete(s),C.menu.context.selection.delete(s)}static getRawMousePos(e){const t=C.canvas.getBoundingClientRect();return new l(e.pageX,e.pageY).minus(t.left,t.top)}static getMousePos(e){return C.getRawMousePos(e).minus(C.mouseHandler.offset).scale(1/C.mouseHandler.zoom)}static isFree(e){if(!e.isValid())return!1;const t=g.at(e);if(!t.isVisible()||t.type!=w.Air)return!1;const s=t.getOutline();for(const e of C.workers)if(e.getOutline().intersects(s))return!1;for(const e of C.items)if(e.getOutline().intersects(s))return!1;for(const e of C.machines)if(e.getOutline().intersects(s))return!1;return!0}static getSelectableAt(e){if(!e.isValid())return null;const t=e.toTilePos(),s=g.at(t);if(!s.isVisible())return null;for(const t of C.workers)if(t.getOutline().contains(e))return t;for(const t of C.items)if(t.getOutline().contains(e))return t;for(const t of C.machines)if(t.getOutline().contains(e))return t;return s.isSelectable()?s:null}static debugMode(){if(!C.debugModeActive){C.debugModeActive=!0,C.gameSpeed=0,C.mouseHandler.brushSize=60;for(const e of C.machines)e.level=100;D.debugMode(),C.resources.add(o.Ore,1e6),C.resources.add(o.Crystal,1e6),C.backgroundDirty=!0}}static debugDisplay(){C.debugDisplayActive=!C.debugDisplayActive,C.backgroundDirty=!0}}C.resources=new class{constructor(){this.list={},this.listeners=[]}add(e,t=1){const s=this.get(e);this.list[e]=t+s;for(const t of this.listeners){if(this.list[e]==s)break;t.onAdd(e,s,this.get(e))}}get(e){return this.list[e]||0}remove(e,t){const s=this.get(e);this.list[e]=Math.max(0,this.get(e)-t);for(const t of this.listeners){if(this.get(e)==s)break;t.onRemove(e,s,this.get(e))}}spawnItem(e,t,s=null){if(0==this.get(e))return null;if(!s){const e=C.machines.spawns().filter(e=>null!=e.freeNeighbor());s=a.nearest(t.target.pos,e,e=>e.pos)}if(!s)return null;this.remove(e,1);const i=s.freeNeighbor();if(!i)throw new Error("Spawn blocked");return C.items.create(i.mid(),e,t)}draw(){let e="";for(const t in this.list){const s=parseInt(t);e+=o[s]+": "+this.get(s)+"\n"}e&&("\n"!=e[e.length-1]&&(e+="\n"),e+="--------------------"),this.display.innerText=e}addListener(e){this.listeners.push(e)}removeListener(e){this.listeners.remove(e)}},C.machines=new class{constructor(){this.map={},this.list=new Set}[Symbol.iterator](){return this.list[Symbol.iterator]()}get count(){return this.list.size}contains(e){return this.list.has(e)}add(e){if(this.map[e.pos.toString()])return!1;this.map[e.pos.toString()]=e;const t=this.count;return this.list.add(e).size>t}remove(e){return delete this.map[e.pos.toString()],this.list.delete(e)}spawns(){return[...this].filter(e=>e.type==k.Spawn)}at(e,t=0){return e instanceof n||(e=new n(e,t)),this.map[e.toString()]}},C.workers=new class extends E{constructor(){super(20)}},C.items=new class extends E{constructor(){super(...arguments),this.requests=new Array,this.unresolved=new Array}request(e,t,s=0){this.requests.push(new P(e,t,s))}create(e,t,s=null){if(!s){const i=this.unresolved.filter(e=>e.type==t),o=a.best(e.toTilePos(),i,e=>e.request.target.pos,(e,t)=>t+10*e.request.priority);o?(s=o.request,0==--o.amount&&this.unresolved.remove(o)):s=null}const i=new c(e,t,s);return C.jobs.add(new p(i)),this.add(i),i}onAdd(e,t,s){const i=this.unresolved.filter(t=>t.type==e&&t.amount!=1/0);if(0==i.length)return;let o=s;for(;o>0&&i.length>0;){const t=i.min(e=>e.request.priority),s=Math.min(t.amount,o);for(let i=0;i<s;i++)C.resources.spawnItem(e,t.request);o-=s}}onRemove(e,t,s){}},C.jobs=new class extends E{},C.menu=new class{onNewSelection(e){this.side.selection.clear(),e.forEach(e=>this.side.selection.add(e)),this.context.selection.clear(),this.refresh()}refresh(){this.side.refresh(),this.context.refresh()}remove(e){this.side.selection.delete(e),this.context.selection.delete(e),this.refresh()}},C.drillLevel=0,C.drillSpeed=1,C.backgroundDirty=!1,C.time=0,C.timeDebt=0,C.gameSpeed=200,C.subTickProgress=0,C.debugModeActive=!1,C.debugDisplayActive=!1,C.TILE_WIDTH=128,C.TILE_HEIGHT=128,C.GAME_WIDTH=C.TILE_WIDTH*H,C.GAME_HEIGHT=C.TILE_HEIGHT*H,C.SCREEN_WIDTH=40*H,C.SCREEN_HEIGHT=40*H,window.Game=C;let L=new TextDecoder("utf-8");const O={env:{random:Math.random,log_str:function(e,t){const s=C.wasm.memory.buffer.slice(e,e+t);console.log(L.decode(s))},err_str:function(e,t){const s=C.wasm.memory.buffer.slice(e,e+t);console.error(L.decode(s))}}},A=fetch("lib.wasm").then(e=>e.arrayBuffer()).then(e=>WebAssembly.instantiate(e,O)).then(e=>e.instance.exports),G=new Promise((e,t)=>window.addEventListener("load",e)).then(()=>createImageBitmap(document.getElementById("assets")));Promise.all([G,A]).then(([e,t])=>{C.init(t,e)}),Array.prototype.min=function(e){if(0==this.length)return null;let t=0,s=e?e(this[0]):this[0];for(let i=1;i<this.length;i++){const o=e?e(this[i]):this[i];o<s&&(t=i,s=o)}return this[t]},Array.prototype.remove=function(e){let t=this.indexOf(e);return-1!=t&&this.splice(t,1),-1!=t},Array.prototype.removeAt=function(e){const t=this.splice(e,1);return t?t[0]:null},Array.prototype.removeWhere=function(e){const t=[];for(let s=0;s<this.length;s++)e(this[s])&&t.push(this.removeAt(s--));return t},Set.prototype.first=function(){return this.values().next().value}}]);