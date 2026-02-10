import{C,B as fi,E as re,V as _,Q as E,M as P,G as se,a as kt,D as Wt,b as $t,L as Ie,c as Pt,I as mi,S as _i,T as vi,R as $,U as gi,d as ae,e as F,f as H,O as pe,g as N,h as Mi,i as Z,j as xi,k as yi,l as zt,m as An,A as Ti,n as ie,N as wi,o as Ri,p as Ei}from"./three-BmB-FXwm.js";/*!
 * @pixiv/three-vrm v2.1.3
 * VRM file loader for three.js.
 *
 * Copyright (c) 2019-2024 pixiv Inc.
 * @pixiv/three-vrm is distributed under MIT License
 * https://github.com/pixiv/three-vrm/blob/release/LICENSE
 *//*!
 * @pixiv/three-vrm-core v2.1.3
 * The implementation of core features of VRM, for @pixiv/three-vrm
 *
 * Copyright (c) 2020-2024 pixiv Inc.
 * @pixiv/three-vrm-core is distributed under MIT License
 * https://github.com/pixiv/three-vrm/blob/release/LICENSE
 */class jt extends pe{get overrideBlinkAmount(){return this.overrideBlink==="block"?0<this.weight?1:0:this.overrideBlink==="blend"?this.weight:0}get overrideLookAtAmount(){return this.overrideLookAt==="block"?0<this.weight?1:0:this.overrideLookAt==="blend"?this.weight:0}get overrideMouthAmount(){return this.overrideMouth==="block"?0<this.weight?1:0:this.overrideMouth==="blend"?this.weight:0}constructor(e){super(),this.weight=0,this.isBinary=!1,this.overrideBlink="none",this.overrideLookAt="none",this.overrideMouth="none",this._binds=[],this.name=`VRMExpression_${e}`,this.expressionName=e,this.type="VRMExpression",this.visible=!1}addBind(e){this._binds.push(e)}applyWeight(e){var t;let n=this.isBinary?this.weight<=.5?0:1:this.weight;n*=(t=e==null?void 0:e.multiplier)!==null&&t!==void 0?t:1,this._binds.forEach(i=>i.applyWeight(n))}clearAppliedWeight(){this._binds.forEach(e=>e.clearAppliedWeight())}}function S(d,e,t,n){function i(o){return o instanceof t?o:new t(function(r){r(o)})}return new(t||(t=Promise))(function(o,r){function s(u){try{l(n.next(u))}catch(c){r(c)}}function a(u){try{l(n.throw(u))}catch(c){r(c)}}function l(u){u.done?o(u.value):i(u.value).then(s,a)}l((n=n.apply(d,[])).next())})}function Pn(d,e,t){var n,i;const o=d.parser.json,r=(n=o.nodes)===null||n===void 0?void 0:n[e];if(r==null)return console.warn(`extractPrimitivesInternal: Attempt to use nodes[${e}] of glTF but the node doesn't exist`),null;const s=r.mesh;if(s==null)return null;const a=(i=o.meshes)===null||i===void 0?void 0:i[s];if(a==null)return console.warn(`extractPrimitivesInternal: Attempt to use meshes[${s}] of glTF but the mesh doesn't exist`),null;const l=a.primitives.length,u=[];return t.traverse(c=>{u.length<l&&c.isMesh&&u.push(c)}),u}function qt(d,e){return S(this,void 0,void 0,function*(){const t=yield d.parser.getDependency("node",e);return Pn(d,e,t)})}function Qt(d){return S(this,void 0,void 0,function*(){const e=yield d.parser.getDependencies("node"),t=new Map;return e.forEach((n,i)=>{const o=Pn(d,i,n);o!=null&&t.set(i,o)}),t})}function Xt(d,e){var t,n;const i=parseInt($,10);let o=null;if(i>=133)o=(n=(t=d.associations.get(e))===null||t===void 0?void 0:t.materials)!==null&&n!==void 0?n:null;else{const s=d.associations.get(e);(s==null?void 0:s.type)==="materials"&&(o=s.index)}return o}const Rt={Aa:"aa",Ih:"ih",Ou:"ou",Ee:"ee",Oh:"oh",Blink:"blink",Happy:"happy",Angry:"angry",Sad:"sad",Relaxed:"relaxed",LookUp:"lookUp",Surprised:"surprised",LookDown:"lookDown",LookLeft:"lookLeft",LookRight:"lookRight",BlinkLeft:"blinkLeft",BlinkRight:"blinkRight",Neutral:"neutral"};function Ln(d){return Math.max(Math.min(d,1),0)}class Se{get expressions(){return this._expressions.concat()}get expressionMap(){return Object.assign({},this._expressionMap)}get presetExpressionMap(){const e={},t=new Set(Object.values(Rt));return Object.entries(this._expressionMap).forEach(([n,i])=>{t.has(n)&&(e[n]=i)}),e}get customExpressionMap(){const e={},t=new Set(Object.values(Rt));return Object.entries(this._expressionMap).forEach(([n,i])=>{t.has(n)||(e[n]=i)}),e}constructor(){this.blinkExpressionNames=["blink","blinkLeft","blinkRight"],this.lookAtExpressionNames=["lookLeft","lookRight","lookUp","lookDown"],this.mouthExpressionNames=["aa","ee","ih","oh","ou"],this._expressions=[],this._expressionMap={}}copy(e){return this._expressions.concat().forEach(n=>{this.unregisterExpression(n)}),e._expressions.forEach(n=>{this.registerExpression(n)}),this.blinkExpressionNames=e.blinkExpressionNames.concat(),this.lookAtExpressionNames=e.lookAtExpressionNames.concat(),this.mouthExpressionNames=e.mouthExpressionNames.concat(),this}clone(){return new Se().copy(this)}getExpression(e){var t;return(t=this._expressionMap[e])!==null&&t!==void 0?t:null}registerExpression(e){this._expressions.push(e),this._expressionMap[e.expressionName]=e}unregisterExpression(e){const t=this._expressions.indexOf(e);t===-1&&console.warn("VRMExpressionManager: The specified expressions is not registered"),this._expressions.splice(t,1),delete this._expressionMap[e.expressionName]}getValue(e){var t;const n=this.getExpression(e);return(t=n==null?void 0:n.weight)!==null&&t!==void 0?t:null}setValue(e,t){const n=this.getExpression(e);n&&(n.weight=Ln(t))}getExpressionTrackName(e){const t=this.getExpression(e);return t?`${t.name}.weight`:null}update(){const e=this._calculateWeightMultipliers();this._expressions.forEach(t=>{t.clearAppliedWeight()}),this._expressions.forEach(t=>{let n=1;const i=t.expressionName;this.blinkExpressionNames.indexOf(i)!==-1&&(n*=e.blink),this.lookAtExpressionNames.indexOf(i)!==-1&&(n*=e.lookAt),this.mouthExpressionNames.indexOf(i)!==-1&&(n*=e.mouth),t.applyWeight({multiplier:n})})}_calculateWeightMultipliers(){let e=1,t=1,n=1;return this._expressions.forEach(i=>{e-=i.overrideBlinkAmount,t-=i.overrideLookAtAmount,n-=i.overrideMouthAmount}),e=Math.max(0,e),t=Math.max(0,t),n=Math.max(0,n),{blink:e,lookAt:t,mouth:n}}}const le={Color:"color",EmissionColor:"emissionColor",ShadeColor:"shadeColor",RimColor:"rimColor",OutlineColor:"outlineColor"},Si={_Color:le.Color,_EmissionColor:le.EmissionColor,_ShadeColor:le.ShadeColor,_RimColor:le.RimColor,_OutlineColor:le.OutlineColor},Ai=new C;class fe{constructor({material:e,type:t,targetValue:n,targetAlpha:i}){this.material=e,this.type=t,this.targetValue=n,this.targetAlpha=i??1;const o=this._initColorBindState(),r=this._initAlphaBindState();this._state={color:o,alpha:r}}applyWeight(e){const{color:t,alpha:n}=this._state;if(t!=null){const{propertyName:i,deltaValue:o}=t,r=this.material[i];r!=null&&r.add(Ai.copy(o).multiplyScalar(e))}if(n!=null){const{propertyName:i,deltaValue:o}=n;this.material[i]!=null&&(this.material[i]+=o*e)}}clearAppliedWeight(){const{color:e,alpha:t}=this._state;if(e!=null){const{propertyName:n,initialValue:i}=e,o=this.material[n];o!=null&&o.copy(i)}if(t!=null){const{propertyName:n,initialValue:i}=t;this.material[n]!=null&&(this.material[n]=i)}}_initColorBindState(){var e,t,n;const{material:i,type:o,targetValue:r}=this,s=this._getPropertyNameMap(),a=(t=(e=s==null?void 0:s[o])===null||e===void 0?void 0:e[0])!==null&&t!==void 0?t:null;if(a==null)return console.warn(`Tried to add a material color bind to the material ${(n=i.name)!==null&&n!==void 0?n:"(no name)"}, the type ${o} but the material or the type is not supported.`),null;const u=i[a].clone(),c=new C(r.r-u.r,r.g-u.g,r.b-u.b);return{propertyName:a,initialValue:u,deltaValue:c}}_initAlphaBindState(){var e,t,n;const{material:i,type:o,targetAlpha:r}=this,s=this._getPropertyNameMap(),a=(t=(e=s==null?void 0:s[o])===null||e===void 0?void 0:e[1])!==null&&t!==void 0?t:null;if(a==null&&r!==1)return console.warn(`Tried to add a material alpha bind to the material ${(n=i.name)!==null&&n!==void 0?n:"(no name)"}, the type ${o} but the material or the type does not support alpha.`),null;if(a==null)return null;const l=i[a],u=r-l;return{propertyName:a,initialValue:l,deltaValue:u}}_getPropertyNameMap(){var e,t;return(t=(e=Object.entries(fe._propertyNameMapMap).find(([n])=>this.material[n]===!0))===null||e===void 0?void 0:e[1])!==null&&t!==void 0?t:null}}fe._propertyNameMapMap={isMeshStandardMaterial:{color:["color","opacity"],emissionColor:["emissive",null]},isMeshBasicMaterial:{color:["color","opacity"]},isMToonMaterial:{color:["color","opacity"],emissionColor:["emissive",null],outlineColor:["outlineColorFactor",null],matcapColor:["matcapFactor",null],rimColor:["parametricRimColorFactor",null],shadeColor:["shadeColorFactor",null]}};class Yt{constructor({primitives:e,index:t,weight:n}){this.primitives=e,this.index=t,this.weight=n}applyWeight(e){this.primitives.forEach(t=>{var n;((n=t.morphTargetInfluences)===null||n===void 0?void 0:n[this.index])!=null&&(t.morphTargetInfluences[this.index]+=this.weight*e)})}clearAppliedWeight(){this.primitives.forEach(e=>{var t;((t=e.morphTargetInfluences)===null||t===void 0?void 0:t[this.index])!=null&&(e.morphTargetInfluences[this.index]=0)})}}const Gt=new ie;class me{constructor({material:e,scale:t,offset:n}){var i,o;this.material=e,this.scale=t,this.offset=n;const r=(i=Object.entries(me._propertyNamesMap).find(([s])=>e[s]===!0))===null||i===void 0?void 0:i[1];r==null?(console.warn(`Tried to add a texture transform bind to the material ${(o=e.name)!==null&&o!==void 0?o:"(no name)"} but the material is not supported.`),this._properties=[]):(this._properties=[],r.forEach(s=>{var a;const l=(a=e[s])===null||a===void 0?void 0:a.clone();if(!l)return null;e[s]=l;const u=l.offset.clone(),c=l.repeat.clone(),f=n.clone().sub(u),h=t.clone().sub(c);this._properties.push({name:s,initialOffset:u,deltaOffset:f,initialScale:c,deltaScale:h})}))}applyWeight(e){this._properties.forEach(t=>{const n=this.material[t.name];n!==void 0&&(n.offset.add(Gt.copy(t.deltaOffset).multiplyScalar(e)),n.repeat.add(Gt.copy(t.deltaScale).multiplyScalar(e)))})}clearAppliedWeight(){this._properties.forEach(e=>{const t=this.material[e.name];t!==void 0&&(t.offset.copy(e.initialOffset),t.repeat.copy(e.initialScale))})}}me._propertyNamesMap={isMeshStandardMaterial:["map","emissiveMap","bumpMap","normalMap","displacementMap","roughnessMap","metalnessMap","alphaMap"],isMeshBasicMaterial:["map","specularMap","alphaMap"],isMToonMaterial:["map","normalMap","emissiveMap","shadeMultiplyTexture","rimMultiplyTexture","outlineWidthMultiplyTexture","uvAnimationMaskTexture"]};const Pi=new Set(["1.0","1.0-beta"]);class be{get name(){return"VRMExpressionLoaderPlugin"}constructor(e){this.parser=e}afterRoot(e){return S(this,void 0,void 0,function*(){e.userData.vrmExpressionManager=yield this._import(e)})}_import(e){return S(this,void 0,void 0,function*(){const t=yield this._v1Import(e);if(t)return t;const n=yield this._v0Import(e);return n||null})}_v1Import(e){var t,n;return S(this,void 0,void 0,function*(){const i=this.parser.json;if(!(((t=i.extensionsUsed)===null||t===void 0?void 0:t.indexOf("VRMC_vrm"))!==-1))return null;const r=(n=i.extensions)===null||n===void 0?void 0:n.VRMC_vrm;if(!r)return null;const s=r.specVersion;if(!Pi.has(s))return console.warn(`VRMExpressionLoaderPlugin: Unknown VRMC_vrm specVersion "${s}"`),null;const a=r.expressions;if(!a)return null;const l=new Set(Object.values(Rt)),u=new Map;a.preset!=null&&Object.entries(a.preset).forEach(([f,h])=>{if(h!=null){if(!l.has(f)){console.warn(`VRMExpressionLoaderPlugin: Unknown preset name "${f}" detected. Ignoring the expression`);return}u.set(f,h)}}),a.custom!=null&&Object.entries(a.custom).forEach(([f,h])=>{if(l.has(f)){console.warn(`VRMExpressionLoaderPlugin: Custom expression cannot have preset name "${f}". Ignoring the expression`);return}u.set(f,h)});const c=new Se;return yield Promise.all(Array.from(u.entries()).map(([f,h])=>S(this,void 0,void 0,function*(){var m,p,g,v,M,y,x;const T=new jt(f);if(e.scene.add(T),T.isBinary=(m=h.isBinary)!==null&&m!==void 0?m:!1,T.overrideBlink=(p=h.overrideBlink)!==null&&p!==void 0?p:"none",T.overrideLookAt=(g=h.overrideLookAt)!==null&&g!==void 0?g:"none",T.overrideMouth=(v=h.overrideMouth)!==null&&v!==void 0?v:"none",(M=h.morphTargetBinds)===null||M===void 0||M.forEach(R=>S(this,void 0,void 0,function*(){var w;if(R.node===void 0||R.index===void 0)return;const I=yield qt(e,R.node),A=R.index;if(!I.every(L=>Array.isArray(L.morphTargetInfluences)&&A<L.morphTargetInfluences.length)){console.warn(`VRMExpressionLoaderPlugin: ${h.name} attempts to index morph #${A} but not found.`);return}T.addBind(new Yt({primitives:I,index:A,weight:(w=R.weight)!==null&&w!==void 0?w:1}))})),h.materialColorBinds||h.textureTransformBinds){const R=[];e.scene.traverse(w=>{const I=w.material;I&&R.push(I)}),(y=h.materialColorBinds)===null||y===void 0||y.forEach(w=>S(this,void 0,void 0,function*(){R.filter(A=>{const L=Xt(this.parser,A);return w.material===L}).forEach(A=>{T.addBind(new fe({material:A,type:w.type,targetValue:new C().fromArray(w.targetValue),targetAlpha:w.targetValue[3]}))})})),(x=h.textureTransformBinds)===null||x===void 0||x.forEach(w=>S(this,void 0,void 0,function*(){R.filter(A=>{const L=Xt(this.parser,A);return w.material===L}).forEach(A=>{var L,b;T.addBind(new me({material:A,offset:new ie().fromArray((L=w.offset)!==null&&L!==void 0?L:[0,0]),scale:new ie().fromArray((b=w.scale)!==null&&b!==void 0?b:[1,1])}))})}))}c.registerExpression(T)}))),c})}_v0Import(e){var t;return S(this,void 0,void 0,function*(){const n=this.parser.json,i=(t=n.extensions)===null||t===void 0?void 0:t.VRM;if(!i)return null;const o=i.blendShapeMaster;if(!o)return null;const r=new Se,s=o.blendShapeGroups;if(!s)return r;const a=new Set;return yield Promise.all(s.map(l=>S(this,void 0,void 0,function*(){var u;const c=l.presetName,f=c!=null&&be.v0v1PresetNameMap[c]||null,h=f??l.name;if(h==null){console.warn("VRMExpressionLoaderPlugin: One of custom expressions has no name. Ignoring the expression");return}if(a.has(h)){console.warn(`VRMExpressionLoaderPlugin: An expression preset ${c} has duplicated entries. Ignoring the expression`);return}a.add(h);const m=new jt(h);e.scene.add(m),m.isBinary=(u=l.isBinary)!==null&&u!==void 0?u:!1,l.binds&&l.binds.forEach(g=>S(this,void 0,void 0,function*(){var v;if(g.mesh===void 0||g.index===void 0)return;const M=[];(v=n.nodes)===null||v===void 0||v.forEach((x,T)=>{x.mesh===g.mesh&&M.push(T)});const y=g.index;yield Promise.all(M.map(x=>S(this,void 0,void 0,function*(){var T;const R=yield qt(e,x);if(!R.every(w=>Array.isArray(w.morphTargetInfluences)&&y<w.morphTargetInfluences.length)){console.warn(`VRMExpressionLoaderPlugin: ${l.name} attempts to index ${y}th morph but not found.`);return}m.addBind(new Yt({primitives:R,index:y,weight:.01*((T=g.weight)!==null&&T!==void 0?T:100)}))})))}));const p=l.materialValues;p&&p.length!==0&&p.forEach(g=>{if(g.materialName===void 0||g.propertyName===void 0||g.targetValue===void 0)return;const v=[];e.scene.traverse(y=>{if(y.material){const x=y.material;Array.isArray(x)?v.push(...x.filter(T=>(T.name===g.materialName||T.name===g.materialName+" (Outline)")&&v.indexOf(T)===-1)):x.name===g.materialName&&v.indexOf(x)===-1&&v.push(x)}});const M=g.propertyName;v.forEach(y=>{if(M==="_MainTex_ST"){const T=new ie(g.targetValue[0],g.targetValue[1]),R=new ie(g.targetValue[2],g.targetValue[3]);R.y=1-R.y-T.y,m.addBind(new me({material:y,scale:T,offset:R}));return}const x=Si[M];if(x){m.addBind(new fe({material:y,type:x,targetValue:new C().fromArray(g.targetValue),targetAlpha:g.targetValue[3]}));return}console.warn(M+" is not supported")})}),r.registerExpression(m)}))),r})}}be.v0v1PresetNameMap={a:"aa",e:"ee",i:"ih",o:"oh",u:"ou",blink:"blink",joy:"happy",angry:"angry",sorrow:"sad",fun:"relaxed",lookup:"lookUp",lookdown:"lookDown",lookleft:"lookLeft",lookright:"lookRight",blink_l:"blinkLeft",blink_r:"blinkRight",neutral:"neutral"};class D{constructor(e,t){this._firstPersonOnlyLayer=D.DEFAULT_FIRSTPERSON_ONLY_LAYER,this._thirdPersonOnlyLayer=D.DEFAULT_THIRDPERSON_ONLY_LAYER,this._initializedLayers=!1,this.humanoid=e,this.meshAnnotations=t}copy(e){if(this.humanoid!==e.humanoid)throw new Error("VRMFirstPerson: humanoid must be same in order to copy");return this.meshAnnotations=e.meshAnnotations.map(t=>({meshes:t.meshes.concat(),type:t.type})),this}clone(){return new D(this.humanoid,this.meshAnnotations).copy(this)}get firstPersonOnlyLayer(){return this._firstPersonOnlyLayer}get thirdPersonOnlyLayer(){return this._thirdPersonOnlyLayer}setup({firstPersonOnlyLayer:e=D.DEFAULT_FIRSTPERSON_ONLY_LAYER,thirdPersonOnlyLayer:t=D.DEFAULT_THIRDPERSON_ONLY_LAYER}={}){this._initializedLayers||(this._firstPersonOnlyLayer=e,this._thirdPersonOnlyLayer=t,this.meshAnnotations.forEach(n=>{n.meshes.forEach(i=>{n.type==="firstPersonOnly"?(i.layers.set(this._firstPersonOnlyLayer),i.traverse(o=>o.layers.set(this._firstPersonOnlyLayer))):n.type==="thirdPersonOnly"?(i.layers.set(this._thirdPersonOnlyLayer),i.traverse(o=>o.layers.set(this._thirdPersonOnlyLayer))):n.type==="auto"&&this._createHeadlessModel(i)})}),this._initializedLayers=!0)}_excludeTriangles(e,t,n,i){let o=0;if(t!=null&&t.length>0)for(let r=0;r<e.length;r+=3){const s=e[r],a=e[r+1],l=e[r+2],u=t[s],c=n[s];if(u[0]>0&&i.includes(c[0])||u[1]>0&&i.includes(c[1])||u[2]>0&&i.includes(c[2])||u[3]>0&&i.includes(c[3]))continue;const f=t[a],h=n[a];if(f[0]>0&&i.includes(h[0])||f[1]>0&&i.includes(h[1])||f[2]>0&&i.includes(h[2])||f[3]>0&&i.includes(h[3]))continue;const m=t[l],p=n[l];m[0]>0&&i.includes(p[0])||m[1]>0&&i.includes(p[1])||m[2]>0&&i.includes(p[2])||m[3]>0&&i.includes(p[3])||(e[o++]=s,e[o++]=a,e[o++]=l)}return o}_createErasedMesh(e,t){const n=new yi(e.geometry.clone(),e.material);n.name=`${e.name}(erase)`,n.frustumCulled=e.frustumCulled,n.layers.set(this._firstPersonOnlyLayer);const i=n.geometry,o=i.getAttribute("skinIndex"),r=o instanceof zt?[]:o.array,s=[];for(let p=0;p<r.length;p+=4)s.push([r[p],r[p+1],r[p+2],r[p+3]]);const a=i.getAttribute("skinWeight"),l=a instanceof zt?[]:a.array,u=[];for(let p=0;p<l.length;p+=4)u.push([l[p],l[p+1],l[p+2],l[p+3]]);const c=i.getIndex();if(!c)throw new Error("The geometry doesn't have an index buffer");const f=Array.from(c.array),h=this._excludeTriangles(f,u,s,t),m=[];for(let p=0;p<h;p++)m[p]=f[p];return i.setIndex(m),e.onBeforeRender&&(n.onBeforeRender=e.onBeforeRender),n.bind(new An(e.skeleton.bones,e.skeleton.boneInverses),new H),n}_createHeadlessModelForSkinnedMesh(e,t){const n=[];if(t.skeleton.bones.forEach((o,r)=>{this._isEraseTarget(o)&&n.push(r)}),!n.length){t.layers.enable(this._thirdPersonOnlyLayer),t.layers.enable(this._firstPersonOnlyLayer);return}t.layers.set(this._thirdPersonOnlyLayer);const i=this._createErasedMesh(t,n);e.add(i)}_createHeadlessModel(e){if(e.type==="Group")if(e.layers.set(this._thirdPersonOnlyLayer),this._isEraseTarget(e))e.traverse(t=>t.layers.set(this._thirdPersonOnlyLayer));else{const t=new se;t.name=`_headless_${e.name}`,t.layers.set(this._firstPersonOnlyLayer),e.parent.add(t),e.children.filter(n=>n.type==="SkinnedMesh").forEach(n=>{const i=n;this._createHeadlessModelForSkinnedMesh(t,i)})}else if(e.type==="SkinnedMesh"){const t=e;this._createHeadlessModelForSkinnedMesh(e.parent,t)}else this._isEraseTarget(e)&&(e.layers.set(this._thirdPersonOnlyLayer),e.traverse(t=>t.layers.set(this._thirdPersonOnlyLayer)))}_isEraseTarget(e){return e===this.humanoid.getRawBoneNode("head")?!0:e.parent?this._isEraseTarget(e.parent):!1}}D.DEFAULT_FIRSTPERSON_ONLY_LAYER=9;D.DEFAULT_THIRDPERSON_ONLY_LAYER=10;const Li=new Set(["1.0","1.0-beta"]);class Ii{get name(){return"VRMFirstPersonLoaderPlugin"}constructor(e){this.parser=e}afterRoot(e){return S(this,void 0,void 0,function*(){const t=e.userData.vrmHumanoid;if(t!==null){if(t===void 0)throw new Error("VRMFirstPersonLoaderPlugin: vrmHumanoid is undefined. VRMHumanoidLoaderPlugin have to be used first");e.userData.vrmFirstPerson=yield this._import(e,t)}})}_import(e,t){return S(this,void 0,void 0,function*(){if(t==null)return null;const n=yield this._v1Import(e,t);if(n)return n;const i=yield this._v0Import(e,t);return i||null})}_v1Import(e,t){var n,i;return S(this,void 0,void 0,function*(){const o=this.parser.json;if(!(((n=o.extensionsUsed)===null||n===void 0?void 0:n.indexOf("VRMC_vrm"))!==-1))return null;const s=(i=o.extensions)===null||i===void 0?void 0:i.VRMC_vrm;if(!s)return null;const a=s.specVersion;if(!Li.has(a))return console.warn(`VRMFirstPersonLoaderPlugin: Unknown VRMC_vrm specVersion "${a}"`),null;const l=s.firstPerson;if(!l)return null;const u=[],c=yield Qt(e);return Array.from(c.entries()).forEach(([f,h])=>{var m;const p=l.meshAnnotations?l.meshAnnotations.find(g=>g.node===f):void 0;u.push({meshes:h,type:(m=p==null?void 0:p.type)!==null&&m!==void 0?m:"both"})}),new D(t,u)})}_v0Import(e,t){var n;return S(this,void 0,void 0,function*(){const i=this.parser.json,o=(n=i.extensions)===null||n===void 0?void 0:n.VRM;if(!o)return null;const r=o.firstPerson;if(!r)return null;const s=[],a=yield Qt(e);return Array.from(a.entries()).forEach(([l,u])=>{const c=i.nodes[l],f=r.meshAnnotations?r.meshAnnotations.find(h=>h.mesh===c.mesh):void 0;s.push({meshes:u,type:this._convertV0FlagToV1Type(f==null?void 0:f.firstPersonFlag)})}),new D(t,s)})}_convertV0FlagToV1Type(e){return e==="FirstPersonOnly"?"firstPersonOnly":e==="ThirdPersonOnly"?"thirdPersonOnly":e==="Auto"?"auto":"both"}}const Zt=new _,Jt=new _,bi=new E;class Kt extends se{constructor(e){super(),this.vrmHumanoid=e,this._boneAxesMap=new Map,Object.values(e.humanBones).forEach(t=>{const n=new Ti(1);n.matrixAutoUpdate=!1,n.material.depthTest=!1,n.material.depthWrite=!1,this.add(n),this._boneAxesMap.set(t,n)})}dispose(){Array.from(this._boneAxesMap.values()).forEach(e=>{e.geometry.dispose(),e.material.dispose()})}updateMatrixWorld(e){Array.from(this._boneAxesMap.entries()).forEach(([t,n])=>{t.node.updateWorldMatrix(!0,!1),t.node.matrixWorld.decompose(Zt,bi,Jt);const i=Zt.set(.1,.1,.1).divide(Jt);n.matrix.copy(t.node.matrixWorld).scale(i)}),super.updateMatrixWorld(e)}}const dt=["hips","spine","chest","upperChest","neck","head","leftEye","rightEye","jaw","leftUpperLeg","leftLowerLeg","leftFoot","leftToes","rightUpperLeg","rightLowerLeg","rightFoot","rightToes","leftShoulder","leftUpperArm","leftLowerArm","leftHand","rightShoulder","rightUpperArm","rightLowerArm","rightHand","leftThumbMetacarpal","leftThumbProximal","leftThumbDistal","leftIndexProximal","leftIndexIntermediate","leftIndexDistal","leftMiddleProximal","leftMiddleIntermediate","leftMiddleDistal","leftRingProximal","leftRingIntermediate","leftRingDistal","leftLittleProximal","leftLittleIntermediate","leftLittleDistal","rightThumbMetacarpal","rightThumbProximal","rightThumbDistal","rightIndexProximal","rightIndexIntermediate","rightIndexDistal","rightMiddleProximal","rightMiddleIntermediate","rightMiddleDistal","rightRingProximal","rightRingIntermediate","rightRingDistal","rightLittleProximal","rightLittleIntermediate","rightLittleDistal"],Ni={hips:null,spine:"hips",chest:"spine",upperChest:"chest",neck:"upperChest",head:"neck",leftEye:"head",rightEye:"head",jaw:"head",leftUpperLeg:"hips",leftLowerLeg:"leftUpperLeg",leftFoot:"leftLowerLeg",leftToes:"leftFoot",rightUpperLeg:"hips",rightLowerLeg:"rightUpperLeg",rightFoot:"rightLowerLeg",rightToes:"rightFoot",leftShoulder:"upperChest",leftUpperArm:"leftShoulder",leftLowerArm:"leftUpperArm",leftHand:"leftLowerArm",rightShoulder:"upperChest",rightUpperArm:"rightShoulder",rightLowerArm:"rightUpperArm",rightHand:"rightLowerArm",leftThumbMetacarpal:"leftHand",leftThumbProximal:"leftThumbMetacarpal",leftThumbDistal:"leftThumbProximal",leftIndexProximal:"leftHand",leftIndexIntermediate:"leftIndexProximal",leftIndexDistal:"leftIndexIntermediate",leftMiddleProximal:"leftHand",leftMiddleIntermediate:"leftMiddleProximal",leftMiddleDistal:"leftMiddleIntermediate",leftRingProximal:"leftHand",leftRingIntermediate:"leftRingProximal",leftRingDistal:"leftRingIntermediate",leftLittleProximal:"leftHand",leftLittleIntermediate:"leftLittleProximal",leftLittleDistal:"leftLittleIntermediate",rightThumbMetacarpal:"rightHand",rightThumbProximal:"rightThumbMetacarpal",rightThumbDistal:"rightThumbProximal",rightIndexProximal:"rightHand",rightIndexIntermediate:"rightIndexProximal",rightIndexDistal:"rightIndexIntermediate",rightMiddleProximal:"rightHand",rightMiddleIntermediate:"rightMiddleProximal",rightMiddleDistal:"rightMiddleIntermediate",rightRingProximal:"rightHand",rightRingIntermediate:"rightRingProximal",rightRingDistal:"rightRingIntermediate",rightLittleProximal:"rightHand",rightLittleIntermediate:"rightLittleProximal",rightLittleDistal:"rightLittleIntermediate"};function In(d){return d.invert?d.invert():d.inverse(),d}const j=new _,q=new E;class Et{constructor(e){this.humanBones=e,this.restPose=this.getAbsolutePose()}getAbsolutePose(){const e={};return Object.keys(this.humanBones).forEach(t=>{const n=t,i=this.getBoneNode(n);i&&(j.copy(i.position),q.copy(i.quaternion),e[n]={position:j.toArray(),rotation:q.toArray()})}),e}getPose(){const e={};return Object.keys(this.humanBones).forEach(t=>{const n=t,i=this.getBoneNode(n);if(!i)return;j.set(0,0,0),q.identity();const o=this.restPose[n];o!=null&&o.position&&j.fromArray(o.position).negate(),o!=null&&o.rotation&&In(q.fromArray(o.rotation)),j.add(i.position),q.premultiply(i.quaternion),e[n]={position:j.toArray(),rotation:q.toArray()}}),e}setPose(e){Object.entries(e).forEach(([t,n])=>{const i=t,o=this.getBoneNode(i);if(!o)return;const r=this.restPose[i];r&&(n!=null&&n.position&&(o.position.fromArray(n.position),r.position&&o.position.add(j.fromArray(r.position))),n!=null&&n.rotation&&(o.quaternion.fromArray(n.rotation),r.rotation&&o.quaternion.multiply(q.fromArray(r.rotation))))})}resetPose(){Object.entries(this.restPose).forEach(([e,t])=>{const n=this.getBoneNode(e);n&&(t!=null&&t.position&&n.position.fromArray(t.position),t!=null&&t.rotation&&n.quaternion.fromArray(t.rotation))})}getBone(e){var t;return(t=this.humanBones[e])!==null&&t!==void 0?t:void 0}getBoneNode(e){var t,n;return(n=(t=this.humanBones[e])===null||t===void 0?void 0:t.node)!==null&&n!==void 0?n:null}}const ct=new _,Ui=new E,Ci=new _;class Ae extends Et{static _setupTransforms(e){const t=new pe;t.name="VRMHumanoidRig";const n={},i={},o={};dt.forEach(s=>{var a;const l=e.getBoneNode(s);if(l){const u=new _,c=new E;l.updateWorldMatrix(!0,!1),l.matrixWorld.decompose(u,c,ct),n[s]=u,i[s]=l.quaternion.clone();const f=new E;(a=l.parent)===null||a===void 0||a.matrixWorld.decompose(ct,f,ct),o[s]=f}});const r={};return dt.forEach(s=>{var a;const l=e.getBoneNode(s);if(l){const u=n[s];let c=s,f;for(;f==null&&(c=Ni[c],c!=null);)f=n[c];const h=new pe;h.name="Normalized_"+l.name,(c?(a=r[c])===null||a===void 0?void 0:a.node:t).add(h),h.position.copy(u),f&&h.position.sub(f),r[s]={node:h}}}),{rigBones:r,root:t,parentWorldRotations:o,boneRotations:i}}constructor(e){const{rigBones:t,root:n,parentWorldRotations:i,boneRotations:o}=Ae._setupTransforms(e);super(t),this.original=e,this.root=n,this._parentWorldRotations=i,this._boneRotations=o}update(){dt.forEach(e=>{const t=this.original.getBoneNode(e);if(t!=null){const n=this.getBoneNode(e),i=this._parentWorldRotations[e],o=Ui.copy(i).invert(),r=this._boneRotations[e];if(t.quaternion.copy(n.quaternion).multiply(i).premultiply(o).multiply(r),e==="hips"){const s=n.getWorldPosition(Ci);t.parent.updateWorldMatrix(!0,!1);const a=t.parent.matrixWorld,l=s.applyMatrix4(a.invert());t.position.copy(l)}}})}}class Pe{get restPose(){return console.warn("VRMHumanoid: restPose is deprecated. Use either rawRestPose or normalizedRestPose instead."),this.rawRestPose}get rawRestPose(){return this._rawHumanBones.restPose}get normalizedRestPose(){return this._normalizedHumanBones.restPose}get humanBones(){return this._rawHumanBones.humanBones}get rawHumanBones(){return this._rawHumanBones.humanBones}get normalizedHumanBones(){return this._normalizedHumanBones.humanBones}get normalizedHumanBonesRoot(){return this._normalizedHumanBones.root}constructor(e,t){var n;this.autoUpdateHumanBones=(n=t==null?void 0:t.autoUpdateHumanBones)!==null&&n!==void 0?n:!0,this._rawHumanBones=new Et(e),this._normalizedHumanBones=new Ae(this._rawHumanBones)}copy(e){return this.autoUpdateHumanBones=e.autoUpdateHumanBones,this._rawHumanBones=new Et(e.humanBones),this._normalizedHumanBones=new Ae(this._rawHumanBones),this}clone(){return new Pe(this.humanBones,{autoUpdateHumanBones:this.autoUpdateHumanBones}).copy(this)}getAbsolutePose(){return console.warn("VRMHumanoid: getAbsolutePose() is deprecated. Use either getRawAbsolutePose() or getNormalizedAbsolutePose() instead."),this.getRawAbsolutePose()}getRawAbsolutePose(){return this._rawHumanBones.getAbsolutePose()}getNormalizedAbsolutePose(){return this._normalizedHumanBones.getAbsolutePose()}getPose(){return console.warn("VRMHumanoid: getPose() is deprecated. Use either getRawPose() or getNormalizedPose() instead."),this.getRawPose()}getRawPose(){return this._rawHumanBones.getPose()}getNormalizedPose(){return this._normalizedHumanBones.getPose()}setPose(e){return console.warn("VRMHumanoid: setPose() is deprecated. Use either setRawPose() or setNormalizedPose() instead."),this.setRawPose(e)}setRawPose(e){return this._rawHumanBones.setPose(e)}setNormalizedPose(e){return this._normalizedHumanBones.setPose(e)}resetPose(){return console.warn("VRMHumanoid: resetPose() is deprecated. Use either resetRawPose() or resetNormalizedPose() instead."),this.resetRawPose()}resetRawPose(){return this._rawHumanBones.resetPose()}resetNormalizedPose(){return this._normalizedHumanBones.resetPose()}getBone(e){return console.warn("VRMHumanoid: getBone() is deprecated. Use either getRawBone() or getNormalizedBone() instead."),this.getRawBone(e)}getRawBone(e){return this._rawHumanBones.getBone(e)}getNormalizedBone(e){return this._normalizedHumanBones.getBone(e)}getBoneNode(e){return console.warn("VRMHumanoid: getBoneNode() is deprecated. Use either getRawBoneNode() or getNormalizedBoneNode() instead."),this.getRawBoneNode(e)}getRawBoneNode(e){return this._rawHumanBones.getBoneNode(e)}getNormalizedBoneNode(e){return this._normalizedHumanBones.getBoneNode(e)}update(){this.autoUpdateHumanBones&&this._normalizedHumanBones.update()}}const Oi={Hips:"hips",Spine:"spine",Head:"head",LeftUpperLeg:"leftUpperLeg",LeftLowerLeg:"leftLowerLeg",LeftFoot:"leftFoot",RightUpperLeg:"rightUpperLeg",RightLowerLeg:"rightLowerLeg",RightFoot:"rightFoot",LeftUpperArm:"leftUpperArm",LeftLowerArm:"leftLowerArm",LeftHand:"leftHand",RightUpperArm:"rightUpperArm",RightLowerArm:"rightLowerArm",RightHand:"rightHand"},Vi=new Set(["1.0","1.0-beta"]),en={leftThumbProximal:"leftThumbMetacarpal",leftThumbIntermediate:"leftThumbProximal",rightThumbProximal:"rightThumbMetacarpal",rightThumbIntermediate:"rightThumbProximal"};class Di{get name(){return"VRMHumanoidLoaderPlugin"}constructor(e,t){this.parser=e,this.helperRoot=t==null?void 0:t.helperRoot,this.autoUpdateHumanBones=t==null?void 0:t.autoUpdateHumanBones}afterRoot(e){return S(this,void 0,void 0,function*(){e.userData.vrmHumanoid=yield this._import(e)})}_import(e){return S(this,void 0,void 0,function*(){const t=yield this._v1Import(e);if(t)return t;const n=yield this._v0Import(e);return n||null})}_v1Import(e){var t,n;return S(this,void 0,void 0,function*(){const i=this.parser.json;if(!(((t=i.extensionsUsed)===null||t===void 0?void 0:t.indexOf("VRMC_vrm"))!==-1))return null;const r=(n=i.extensions)===null||n===void 0?void 0:n.VRMC_vrm;if(!r)return null;const s=r.specVersion;if(!Vi.has(s))return console.warn(`VRMHumanoidLoaderPlugin: Unknown VRMC_vrm specVersion "${s}"`),null;const a=r.humanoid;if(!a)return null;const l=a.humanBones.leftThumbIntermediate!=null||a.humanBones.rightThumbIntermediate!=null,u={};a.humanBones!=null&&(yield Promise.all(Object.entries(a.humanBones).map(([f,h])=>S(this,void 0,void 0,function*(){let m=f;const p=h.node;if(l){const v=en[m];v!=null&&(m=v)}const g=yield this.parser.getDependency("node",p);if(g==null){console.warn(`A glTF node bound to the humanoid bone ${m} (index = ${p}) does not exist`);return}u[m]={node:g}}))));const c=new Pe(this._ensureRequiredBonesExist(u),{autoUpdateHumanBones:this.autoUpdateHumanBones});if(e.scene.add(c.normalizedHumanBonesRoot),this.helperRoot){const f=new Kt(c);this.helperRoot.add(f),f.renderOrder=this.helperRoot.renderOrder}return c})}_v0Import(e){var t;return S(this,void 0,void 0,function*(){const i=(t=this.parser.json.extensions)===null||t===void 0?void 0:t.VRM;if(!i)return null;const o=i.humanoid;if(!o)return null;const r={};o.humanBones!=null&&(yield Promise.all(o.humanBones.map(a=>S(this,void 0,void 0,function*(){const l=a.bone,u=a.node;if(l==null||u==null)return;const c=yield this.parser.getDependency("node",u);if(c==null){console.warn(`A glTF node bound to the humanoid bone ${l} (index = ${u}) does not exist`);return}const f=en[l],h=f??l;if(r[h]!=null){console.warn(`Multiple bone entries for ${h} detected (index = ${u}), ignoring duplicated entries.`);return}r[h]={node:c}}))));const s=new Pe(this._ensureRequiredBonesExist(r),{autoUpdateHumanBones:this.autoUpdateHumanBones});if(e.scene.add(s.normalizedHumanBonesRoot),this.helperRoot){const a=new Kt(s);this.helperRoot.add(a),a.renderOrder=this.helperRoot.renderOrder}return s})}_ensureRequiredBonesExist(e){const t=Object.values(Oi).filter(n=>e[n]==null);if(t.length>0)throw new Error(`VRMHumanoidLoaderPlugin: These humanoid bones are required but not exist: ${t.join(", ")}`);return e}}class tn extends Z{constructor(){super(),this._currentTheta=0,this._currentRadius=0,this.theta=0,this.radius=0,this._currentTheta=0,this._currentRadius=0,this._attrPos=new N(new Float32Array(65*3),3),this.setAttribute("position",this._attrPos),this._attrIndex=new N(new Uint16Array(3*63),1),this.setIndex(this._attrIndex),this._buildIndex(),this.update()}update(){let e=!1;this._currentTheta!==this.theta&&(this._currentTheta=this.theta,e=!0),this._currentRadius!==this.radius&&(this._currentRadius=this.radius,e=!0),e&&this._buildPosition()}_buildPosition(){this._attrPos.setXYZ(0,0,0,0);for(let e=0;e<64;e++){const t=e/63*this._currentTheta;this._attrPos.setXYZ(e+1,this._currentRadius*Math.sin(t),0,this._currentRadius*Math.cos(t))}this._attrPos.needsUpdate=!0}_buildIndex(){for(let e=0;e<63;e++)this._attrIndex.setXYZ(e*3,0,e+1,e+2);this._attrIndex.needsUpdate=!0}}class Fi extends Z{constructor(){super(),this.radius=0,this._currentRadius=0,this.tail=new _,this._currentTail=new _,this._attrPos=new N(new Float32Array(294),3),this.setAttribute("position",this._attrPos),this._attrIndex=new N(new Uint16Array(194),1),this.setIndex(this._attrIndex),this._buildIndex(),this.update()}update(){let e=!1;this._currentRadius!==this.radius&&(this._currentRadius=this.radius,e=!0),this._currentTail.equals(this.tail)||(this._currentTail.copy(this.tail),e=!0),e&&this._buildPosition()}_buildPosition(){for(let e=0;e<32;e++){const t=e/16*Math.PI;this._attrPos.setXYZ(e,Math.cos(t),Math.sin(t),0),this._attrPos.setXYZ(32+e,0,Math.cos(t),Math.sin(t)),this._attrPos.setXYZ(64+e,Math.sin(t),0,Math.cos(t))}this.scale(this._currentRadius,this._currentRadius,this._currentRadius),this.translate(this._currentTail.x,this._currentTail.y,this._currentTail.z),this._attrPos.setXYZ(96,0,0,0),this._attrPos.setXYZ(97,this._currentTail.x,this._currentTail.y,this._currentTail.z),this._attrPos.needsUpdate=!0}_buildIndex(){for(let e=0;e<32;e++){const t=(e+1)%32;this._attrIndex.setXY(e*2,e,t),this._attrIndex.setXY(64+e*2,32+e,32+t),this._attrIndex.setXY(128+e*2,64+e,64+t)}this._attrIndex.setXY(192,96,97),this._attrIndex.needsUpdate=!0}}const xe=new E,nn=new E,ue=new _,on=new _,rn=Math.sqrt(2)/2,Bi=new E(0,0,-rn,rn),Hi=new _(0,1,0);class ki extends se{constructor(e){super(),this.matrixAutoUpdate=!1,this.vrmLookAt=e;{const t=new tn;t.radius=.5;const n=new kt({color:65280,transparent:!0,opacity:.5,side:Wt,depthTest:!1,depthWrite:!1});this._meshPitch=new $t(t,n),this.add(this._meshPitch)}{const t=new tn;t.radius=.5;const n=new kt({color:16711680,transparent:!0,opacity:.5,side:Wt,depthTest:!1,depthWrite:!1});this._meshYaw=new $t(t,n),this.add(this._meshYaw)}{const t=new Fi;t.radius=.1;const n=new Ie({color:16777215,depthTest:!1,depthWrite:!1});this._lineTarget=new Pt(t,n),this._lineTarget.frustumCulled=!1,this.add(this._lineTarget)}}dispose(){this._meshYaw.geometry.dispose(),this._meshYaw.material.dispose(),this._meshPitch.geometry.dispose(),this._meshPitch.material.dispose(),this._lineTarget.geometry.dispose(),this._lineTarget.material.dispose()}updateMatrixWorld(e){const t=P.DEG2RAD*this.vrmLookAt.yaw;this._meshYaw.geometry.theta=t,this._meshYaw.geometry.update();const n=P.DEG2RAD*this.vrmLookAt.pitch;this._meshPitch.geometry.theta=n,this._meshPitch.geometry.update(),this.vrmLookAt.getLookAtWorldPosition(ue),this.vrmLookAt.getLookAtWorldQuaternion(xe),xe.multiply(this.vrmLookAt.getFaceFrontQuaternion(nn)),this._meshYaw.position.copy(ue),this._meshYaw.quaternion.copy(xe),this._meshPitch.position.copy(ue),this._meshPitch.quaternion.copy(xe),this._meshPitch.quaternion.multiply(nn.setFromAxisAngle(Hi,t)),this._meshPitch.quaternion.multiply(Bi);const{target:i,autoUpdate:o}=this.vrmLookAt;i!=null&&o&&(i.getWorldPosition(on).sub(ue),this._lineTarget.geometry.tail.copy(on),this._lineTarget.geometry.update(),this._lineTarget.position.copy(ue)),super.updateMatrixWorld(e)}}const Wi=new _,$i=new _;function St(d,e){return d.matrixWorld.decompose(Wi,e,$i),e}function Re(d){return[Math.atan2(-d.z,d.x),Math.atan2(d.y,Math.sqrt(d.x*d.x+d.z*d.z))]}function sn(d){const e=Math.round(d/2/Math.PI);return d-2*Math.PI*e}const an=new _(0,0,1),zi=new _,ji=new _,qi=new _,Qi=new E,ht=new E,ln=new E,Xi=new E,pt=new re;let bn=class Nn{get yaw(){return this._yaw}set yaw(e){this._yaw=e,this._needsUpdate=!0}get pitch(){return this._pitch}set pitch(e){this._pitch=e,this._needsUpdate=!0}get euler(){return console.warn("VRMLookAt: euler is deprecated. use getEuler() instead."),this.getEuler(new re)}constructor(e,t){this.offsetFromHeadBone=new _,this.autoUpdate=!0,this.faceFront=new _(0,0,1),this.humanoid=e,this.applier=t,this._yaw=0,this._pitch=0,this._needsUpdate=!0,this._restHeadWorldQuaternion=this.getLookAtWorldQuaternion(new E)}getEuler(e){return e.set(P.DEG2RAD*this._pitch,P.DEG2RAD*this._yaw,0,"YXZ")}copy(e){if(this.humanoid!==e.humanoid)throw new Error("VRMLookAt: humanoid must be same in order to copy");return this.offsetFromHeadBone.copy(e.offsetFromHeadBone),this.applier=e.applier,this.autoUpdate=e.autoUpdate,this.target=e.target,this.faceFront.copy(e.faceFront),this}clone(){return new Nn(this.humanoid,this.applier).copy(this)}reset(){this._yaw=0,this._pitch=0,this._needsUpdate=!0}getLookAtWorldPosition(e){const t=this.humanoid.getRawBoneNode("head");return e.copy(this.offsetFromHeadBone).applyMatrix4(t.matrixWorld)}getLookAtWorldQuaternion(e){const t=this.humanoid.getRawBoneNode("head");return St(t,e)}getFaceFrontQuaternion(e){if(this.faceFront.distanceToSquared(an)<.01)return e.copy(this._restHeadWorldQuaternion).invert();const[t,n]=Re(this.faceFront);return pt.set(0,.5*Math.PI+t,n,"YZX"),e.setFromEuler(pt).premultiply(Xi.copy(this._restHeadWorldQuaternion).invert())}getLookAtWorldDirection(e){return this.getLookAtWorldQuaternion(ht),this.getFaceFrontQuaternion(ln),e.copy(an).applyQuaternion(ht).applyQuaternion(ln).applyEuler(this.getEuler(pt))}lookAt(e){const t=Qi.copy(this._restHeadWorldQuaternion).multiply(In(this.getLookAtWorldQuaternion(ht))),n=this.getLookAtWorldPosition(ji),i=qi.copy(e).sub(n).applyQuaternion(t).normalize(),[o,r]=Re(this.faceFront),[s,a]=Re(i),l=sn(s-o),u=sn(r-a);this._yaw=P.RAD2DEG*l,this._pitch=P.RAD2DEG*u,this._needsUpdate=!0}update(e){this.target!=null&&this.autoUpdate&&this.lookAt(this.target.getWorldPosition(zi)),this._needsUpdate&&(this._needsUpdate=!1,this.applier.applyYawPitch(this._yaw,this._pitch))}};bn.EULER_ORDER="YXZ";const Yi=new _(0,0,1),O=new E,K=new E,U=new re(0,0,0,"YXZ");class Ee{constructor(e,t,n,i,o){this.humanoid=e,this.rangeMapHorizontalInner=t,this.rangeMapHorizontalOuter=n,this.rangeMapVerticalDown=i,this.rangeMapVerticalUp=o,this.faceFront=new _(0,0,1),this._restQuatLeftEye=new E,this._restQuatRightEye=new E,this._restLeftEyeParentWorldQuat=new E,this._restRightEyeParentWorldQuat=new E;const r=this.humanoid.getRawBoneNode("leftEye"),s=this.humanoid.getRawBoneNode("rightEye");r&&(this._restQuatLeftEye.copy(r.quaternion),St(r.parent,this._restLeftEyeParentWorldQuat)),s&&(this._restQuatRightEye.copy(s.quaternion),St(s.parent,this._restRightEyeParentWorldQuat))}applyYawPitch(e,t){const n=this.humanoid.getRawBoneNode("leftEye"),i=this.humanoid.getRawBoneNode("rightEye"),o=this.humanoid.getNormalizedBoneNode("leftEye"),r=this.humanoid.getNormalizedBoneNode("rightEye");n&&(t<0?U.x=-P.DEG2RAD*this.rangeMapVerticalDown.map(-t):U.x=P.DEG2RAD*this.rangeMapVerticalUp.map(t),e<0?U.y=-P.DEG2RAD*this.rangeMapHorizontalInner.map(-e):U.y=P.DEG2RAD*this.rangeMapHorizontalOuter.map(e),O.setFromEuler(U),this._getWorldFaceFrontQuat(K),o.quaternion.copy(K).multiply(O).multiply(K.invert()),O.copy(this._restLeftEyeParentWorldQuat),n.quaternion.copy(o.quaternion).multiply(O).premultiply(O.invert()).multiply(this._restQuatLeftEye)),i&&(t<0?U.x=-P.DEG2RAD*this.rangeMapVerticalDown.map(-t):U.x=P.DEG2RAD*this.rangeMapVerticalUp.map(t),e<0?U.y=-P.DEG2RAD*this.rangeMapHorizontalOuter.map(-e):U.y=P.DEG2RAD*this.rangeMapHorizontalInner.map(e),O.setFromEuler(U),this._getWorldFaceFrontQuat(K),r.quaternion.copy(K).multiply(O).multiply(K.invert()),O.copy(this._restRightEyeParentWorldQuat),i.quaternion.copy(r.quaternion).multiply(O).premultiply(O.invert()).multiply(this._restQuatRightEye))}lookAt(e){console.warn("VRMLookAtBoneApplier: lookAt() is deprecated. use apply() instead.");const t=P.RAD2DEG*e.y,n=P.RAD2DEG*e.x;this.applyYawPitch(t,n)}_getWorldFaceFrontQuat(e){if(this.faceFront.distanceToSquared(Yi)<.01)return e.identity();const[t,n]=Re(this.faceFront);return U.set(0,.5*Math.PI+t,n,"YZX"),e.setFromEuler(U)}}Ee.type="bone";class At{constructor(e,t,n,i,o){this.expressions=e,this.rangeMapHorizontalInner=t,this.rangeMapHorizontalOuter=n,this.rangeMapVerticalDown=i,this.rangeMapVerticalUp=o}applyYawPitch(e,t){t<0?(this.expressions.setValue("lookDown",0),this.expressions.setValue("lookUp",this.rangeMapVerticalUp.map(-t))):(this.expressions.setValue("lookUp",0),this.expressions.setValue("lookDown",this.rangeMapVerticalDown.map(t))),e<0?(this.expressions.setValue("lookLeft",0),this.expressions.setValue("lookRight",this.rangeMapHorizontalOuter.map(-e))):(this.expressions.setValue("lookRight",0),this.expressions.setValue("lookLeft",this.rangeMapHorizontalOuter.map(e)))}lookAt(e){console.warn("VRMLookAtBoneApplier: lookAt() is deprecated. use apply() instead.");const t=P.RAD2DEG*e.y,n=P.RAD2DEG*e.x;this.applyYawPitch(t,n)}}At.type="expression";class un{constructor(e,t){this.inputMaxValue=e,this.outputScale=t}map(e){return this.outputScale*Ln(e/this.inputMaxValue)}}const Gi=new Set(["1.0","1.0-beta"]),ye=.01;class Zi{get name(){return"VRMLookAtLoaderPlugin"}constructor(e,t){this.parser=e,this.helperRoot=t==null?void 0:t.helperRoot}afterRoot(e){return S(this,void 0,void 0,function*(){const t=e.userData.vrmHumanoid;if(t===null)return;if(t===void 0)throw new Error("VRMLookAtLoaderPlugin: vrmHumanoid is undefined. VRMHumanoidLoaderPlugin have to be used first");const n=e.userData.vrmExpressionManager;if(n!==null){if(n===void 0)throw new Error("VRMLookAtLoaderPlugin: vrmExpressionManager is undefined. VRMExpressionLoaderPlugin have to be used first");e.userData.vrmLookAt=yield this._import(e,t,n)}})}_import(e,t,n){return S(this,void 0,void 0,function*(){if(t==null||n==null)return null;const i=yield this._v1Import(e,t,n);if(i)return i;const o=yield this._v0Import(e,t,n);return o||null})}_v1Import(e,t,n){var i,o,r;return S(this,void 0,void 0,function*(){const s=this.parser.json;if(!(((i=s.extensionsUsed)===null||i===void 0?void 0:i.indexOf("VRMC_vrm"))!==-1))return null;const l=(o=s.extensions)===null||o===void 0?void 0:o.VRMC_vrm;if(!l)return null;const u=l.specVersion;if(!Gi.has(u))return console.warn(`VRMLookAtLoaderPlugin: Unknown VRMC_vrm specVersion "${u}"`),null;const c=l.lookAt;if(!c)return null;const f=c.type==="expression"?1:10,h=this._v1ImportRangeMap(c.rangeMapHorizontalInner,f),m=this._v1ImportRangeMap(c.rangeMapHorizontalOuter,f),p=this._v1ImportRangeMap(c.rangeMapVerticalDown,f),g=this._v1ImportRangeMap(c.rangeMapVerticalUp,f);let v;c.type==="expression"?v=new At(n,h,m,p,g):v=new Ee(t,h,m,p,g);const M=this._importLookAt(t,v);return M.offsetFromHeadBone.fromArray((r=c.offsetFromHeadBone)!==null&&r!==void 0?r:[0,.06,0]),M})}_v1ImportRangeMap(e,t){var n,i;let o=(n=e==null?void 0:e.inputMaxValue)!==null&&n!==void 0?n:90;const r=(i=e==null?void 0:e.outputScale)!==null&&i!==void 0?i:t;return o<ye&&(console.warn("VRMLookAtLoaderPlugin: inputMaxValue of a range map is too small. Consider reviewing the range map!"),o=ye),new un(o,r)}_v0Import(e,t,n){var i,o,r,s;return S(this,void 0,void 0,function*(){const l=(i=this.parser.json.extensions)===null||i===void 0?void 0:i.VRM;if(!l)return null;const u=l.firstPerson;if(!u)return null;const c=u.lookAtTypeName==="BlendShape"?1:10,f=this._v0ImportDegreeMap(u.lookAtHorizontalInner,c),h=this._v0ImportDegreeMap(u.lookAtHorizontalOuter,c),m=this._v0ImportDegreeMap(u.lookAtVerticalDown,c),p=this._v0ImportDegreeMap(u.lookAtVerticalUp,c);let g;u.lookAtTypeName==="BlendShape"?g=new At(n,f,h,m,p):g=new Ee(t,f,h,m,p);const v=this._importLookAt(t,g);return u.firstPersonBoneOffset?v.offsetFromHeadBone.set((o=u.firstPersonBoneOffset.x)!==null&&o!==void 0?o:0,(r=u.firstPersonBoneOffset.y)!==null&&r!==void 0?r:.06,-((s=u.firstPersonBoneOffset.z)!==null&&s!==void 0?s:0)):v.offsetFromHeadBone.set(0,.06,0),v.faceFront.set(0,0,-1),g instanceof Ee&&g.faceFront.set(0,0,-1),v})}_v0ImportDegreeMap(e,t){var n,i;const o=e==null?void 0:e.curve;JSON.stringify(o)!=="[0,0,0,1,1,1,1,0]"&&console.warn("Curves of LookAtDegreeMap defined in VRM 0.0 are not supported");let r=(n=e==null?void 0:e.xRange)!==null&&n!==void 0?n:90;const s=(i=e==null?void 0:e.yRange)!==null&&i!==void 0?i:t;return r<ye&&(console.warn("VRMLookAtLoaderPlugin: xRange of a degree map is too small. Consider reviewing the degree map!"),r=ye),new un(r,s)}_importLookAt(e,t){const n=new bn(e,t);if(this.helperRoot){const i=new ki(n);this.helperRoot.add(i),i.renderOrder=this.helperRoot.renderOrder}return n}}function Ji(d,e){return typeof d!="string"||d===""?"":(/^https?:\/\//i.test(e)&&/^\//.test(d)&&(e=e.replace(/(^https?:\/\/[^/]+).*/i,"$1")),/^(https?:)?\/\//i.test(d)||/^data:.*,.*$/i.test(d)||/^blob:.*$/i.test(d)?d:e+d)}const Ki=new Set(["1.0","1.0-beta"]);class eo{get name(){return"VRMMetaLoaderPlugin"}constructor(e,t){var n,i,o;this.parser=e,this.needThumbnailImage=(n=t==null?void 0:t.needThumbnailImage)!==null&&n!==void 0?n:!0,this.acceptLicenseUrls=(i=t==null?void 0:t.acceptLicenseUrls)!==null&&i!==void 0?i:["https://vrm.dev/licenses/1.0/"],this.acceptV0Meta=(o=t==null?void 0:t.acceptV0Meta)!==null&&o!==void 0?o:!0}afterRoot(e){return S(this,void 0,void 0,function*(){e.userData.vrmMeta=yield this._import(e)})}_import(e){return S(this,void 0,void 0,function*(){const t=yield this._v1Import(e);if(t!=null)return t;const n=yield this._v0Import(e);return n??null})}_v1Import(e){var t,n,i;return S(this,void 0,void 0,function*(){const o=this.parser.json;if(!(((t=o.extensionsUsed)===null||t===void 0?void 0:t.indexOf("VRMC_vrm"))!==-1))return null;const s=(n=o.extensions)===null||n===void 0?void 0:n.VRMC_vrm;if(s==null)return null;const a=s.specVersion;if(!Ki.has(a))return console.warn(`VRMMetaLoaderPlugin: Unknown VRMC_vrm specVersion "${a}"`),null;const l=s.meta;if(!l)return null;const u=l.licenseUrl;if(!new Set(this.acceptLicenseUrls).has(u))throw new Error(`VRMMetaLoaderPlugin: The license url "${u}" is not accepted`);let f;return this.needThumbnailImage&&l.thumbnailImage!=null&&(f=(i=yield this._extractGLTFImage(l.thumbnailImage))!==null&&i!==void 0?i:void 0),{metaVersion:"1",name:l.name,version:l.version,authors:l.authors,copyrightInformation:l.copyrightInformation,contactInformation:l.contactInformation,references:l.references,thirdPartyLicenses:l.thirdPartyLicenses,thumbnailImage:f,licenseUrl:l.licenseUrl,avatarPermission:l.avatarPermission,allowExcessivelyViolentUsage:l.allowExcessivelyViolentUsage,allowExcessivelySexualUsage:l.allowExcessivelySexualUsage,commercialUsage:l.commercialUsage,allowPoliticalOrReligiousUsage:l.allowPoliticalOrReligiousUsage,allowAntisocialOrHateUsage:l.allowAntisocialOrHateUsage,creditNotation:l.creditNotation,allowRedistribution:l.allowRedistribution,modification:l.modification,otherLicenseUrl:l.otherLicenseUrl}})}_v0Import(e){var t;return S(this,void 0,void 0,function*(){const i=(t=this.parser.json.extensions)===null||t===void 0?void 0:t.VRM;if(!i)return null;const o=i.meta;if(!o)return null;if(!this.acceptV0Meta)throw new Error("VRMMetaLoaderPlugin: Attempted to load VRM0.0 meta but acceptV0Meta is false");let r;return this.needThumbnailImage&&o.texture!=null&&o.texture!==-1&&(r=yield this.parser.getDependency("texture",o.texture)),{metaVersion:"0",allowedUserName:o.allowedUserName,author:o.author,commercialUssageName:o.commercialUssageName,contactInformation:o.contactInformation,licenseName:o.licenseName,otherLicenseUrl:o.otherLicenseUrl,otherPermissionUrl:o.otherPermissionUrl,reference:o.reference,sexualUssageName:o.sexualUssageName,texture:r??void 0,title:o.title,version:o.version,violentUssageName:o.violentUssageName}})}_extractGLTFImage(e){var t;return S(this,void 0,void 0,function*(){const i=(t=this.parser.json.images)===null||t===void 0?void 0:t[e];if(i==null)return console.warn(`VRMMetaLoaderPlugin: Attempt to use images[${e}] of glTF as a thumbnail but the image doesn't exist`),null;let o=i.uri;if(i.bufferView!=null){const s=yield this.parser.getDependency("bufferView",i.bufferView),a=new Blob([s],{type:i.mimeType});o=URL.createObjectURL(a)}return o==null?(console.warn(`VRMMetaLoaderPlugin: Attempt to use images[${e}] of glTF as a thumbnail but the image couldn't load properly`),null):yield new mi().loadAsync(Ji(o,this.parser.options.path)).catch(s=>(console.error(s),console.warn("VRMMetaLoaderPlugin: Failed to load a thumbnail image"),null))})}}class to{constructor(e){this.scene=e.scene,this.meta=e.meta,this.humanoid=e.humanoid,this.expressionManager=e.expressionManager,this.firstPerson=e.firstPerson,this.lookAt=e.lookAt}update(e){this.humanoid.update(),this.lookAt&&this.lookAt.update(e),this.expressionManager&&this.expressionManager.update()}}class no extends to{constructor(e){super(e),this.materials=e.materials,this.springBoneManager=e.springBoneManager,this.nodeConstraintManager=e.nodeConstraintManager}update(e){super.update(e),this.nodeConstraintManager&&this.nodeConstraintManager.update(),this.springBoneManager&&this.springBoneManager.update(e),this.materials&&this.materials.forEach(t=>{t.update&&t.update(e)})}}function Te(d,e,t,n){function i(o){return o instanceof t?o:new t(function(r){r(o)})}return new(t||(t=Promise))(function(o,r){function s(u){try{l(n.next(u))}catch(c){r(c)}}function a(u){try{l(n.throw(u))}catch(c){r(c)}}function l(u){u.done?o(u.value):i(u.value).then(s,a)}l((n=n.apply(d,[])).next())})}/*!
 * @pixiv/three-vrm-materials-mtoon v2.1.3
 * MToon (toon material) module for @pixiv/three-vrm
 *
 * Copyright (c) 2020-2024 pixiv Inc.
 * @pixiv/three-vrm-materials-mtoon is distributed under MIT License
 * https://github.com/pixiv/three-vrm/blob/release/LICENSE
 */function X(d,e,t,n){function i(o){return o instanceof t?o:new t(function(r){r(o)})}return new(t||(t=Promise))(function(o,r){function s(u){try{l(n.next(u))}catch(c){r(c)}}function a(u){try{l(n.throw(u))}catch(c){r(c)}}function l(u){u.done?o(u.value):i(u.value).then(s,a)}l((n=n.apply(d,[])).next())})}var io=`// #define PHONG

varying vec3 vViewPosition;

#ifndef FLAT_SHADED
  varying vec3 vNormal;
#endif

#include <common>

// #include <uv_pars_vertex>
#ifdef MTOON_USE_UV
  varying vec2 vUv;

  // COMPAT: pre-r151 uses a common uvTransform
  #if THREE_VRM_THREE_REVISION < 151
    uniform mat3 uvTransform;
  #endif
#endif

// #include <uv2_pars_vertex>
// COMAPT: pre-r151 uses uv2 for lightMap and aoMap
#if THREE_VRM_THREE_REVISION < 151
  #if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
    attribute vec2 uv2;
    varying vec2 vUv2;
    uniform mat3 uv2Transform;
  #endif
#endif

// #include <displacementmap_pars_vertex>
// #include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

#ifdef USE_OUTLINEWIDTHMULTIPLYTEXTURE
  uniform sampler2D outlineWidthMultiplyTexture;
  uniform mat3 outlineWidthMultiplyTextureUvTransform;
#endif

uniform float outlineWidthFactor;

void main() {

  // #include <uv_vertex>
  #ifdef MTOON_USE_UV
    // COMPAT: pre-r151 uses a common uvTransform
    #if THREE_VRM_THREE_REVISION >= 151
      vUv = uv;
    #else
      vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
    #endif
  #endif

  // #include <uv2_vertex>
  // COMAPT: pre-r151 uses uv2 for lightMap and aoMap
  #if THREE_VRM_THREE_REVISION < 151
    #if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
      vUv2 = ( uv2Transform * vec3( uv2, 1 ) ).xy;
    #endif
  #endif

  #include <color_vertex>

  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>

  // we need this to compute the outline properly
  objectNormal = normalize( objectNormal );

  #include <defaultnormal_vertex>

  #ifndef FLAT_SHADED // Normal computed with derivatives when FLAT_SHADED
    vNormal = normalize( transformedNormal );
  #endif

  #include <begin_vertex>

  #include <morphtarget_vertex>
  #include <skinning_vertex>
  // #include <displacementmap_vertex>
  #include <project_vertex>
  #include <logdepthbuf_vertex>
  #include <clipping_planes_vertex>

  vViewPosition = - mvPosition.xyz;

  float outlineTex = 1.0;

  #ifdef OUTLINE
    #ifdef USE_OUTLINEWIDTHMULTIPLYTEXTURE
      vec2 outlineWidthMultiplyTextureUv = ( outlineWidthMultiplyTextureUvTransform * vec3( vUv, 1 ) ).xy;
      outlineTex = texture2D( outlineWidthMultiplyTexture, outlineWidthMultiplyTextureUv ).g;
    #endif

    #ifdef OUTLINE_WIDTH_WORLD
      float worldNormalLength = length( transformedNormal );
      vec3 outlineOffset = outlineWidthFactor * outlineTex * worldNormalLength * objectNormal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( outlineOffset + transformed, 1.0 );
    #endif

    #ifdef OUTLINE_WIDTH_SCREEN
      vec3 clipNormal = ( projectionMatrix * modelViewMatrix * vec4( objectNormal, 0.0 ) ).xyz;
      vec2 projectedNormal = normalize( clipNormal.xy );
      projectedNormal.x *= projectionMatrix[ 0 ].x / projectionMatrix[ 1 ].y;
      gl_Position.xy += 2.0 * outlineWidthFactor * outlineTex * projectedNormal.xy;
    #endif

    gl_Position.z += 1E-6 * gl_Position.w; // anti-artifact magic
  #endif

  #include <worldpos_vertex>
  // #include <envmap_vertex>
  #include <shadowmap_vertex>
  #include <fog_vertex>

}`,oo=`// #define PHONG

uniform vec3 litFactor;

uniform float opacity;

uniform vec3 shadeColorFactor;
#ifdef USE_SHADEMULTIPLYTEXTURE
  uniform sampler2D shadeMultiplyTexture;
  uniform mat3 shadeMultiplyTextureUvTransform;
#endif

uniform float shadingShiftFactor;
uniform float shadingToonyFactor;

#ifdef USE_SHADINGSHIFTTEXTURE
  uniform sampler2D shadingShiftTexture;
  uniform mat3 shadingShiftTextureUvTransform;
  uniform float shadingShiftTextureScale;
#endif

uniform float giEqualizationFactor;

uniform vec3 parametricRimColorFactor;
#ifdef USE_RIMMULTIPLYTEXTURE
  uniform sampler2D rimMultiplyTexture;
  uniform mat3 rimMultiplyTextureUvTransform;
#endif
uniform float rimLightingMixFactor;
uniform float parametricRimFresnelPowerFactor;
uniform float parametricRimLiftFactor;

#ifdef USE_MATCAPTEXTURE
  uniform vec3 matcapFactor;
  uniform sampler2D matcapTexture;
  uniform mat3 matcapTextureUvTransform;
#endif

uniform vec3 emissive;
uniform float emissiveIntensity;

uniform vec3 outlineColorFactor;
uniform float outlineLightingMixFactor;

#ifdef USE_UVANIMATIONMASKTEXTURE
  uniform sampler2D uvAnimationMaskTexture;
  uniform mat3 uvAnimationMaskTextureUvTransform;
#endif

uniform float uvAnimationScrollXOffset;
uniform float uvAnimationScrollYOffset;
uniform float uvAnimationRotationPhase;

#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>

// #include <uv_pars_fragment>
#if ( defined( MTOON_USE_UV ) && !defined( MTOON_UVS_VERTEX_ONLY ) )
  varying vec2 vUv;
#endif

// #include <uv2_pars_fragment>
// COMAPT: pre-r151 uses uv2 for lightMap and aoMap
#if THREE_VRM_THREE_REVISION < 151
  #if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
    varying vec2 vUv2;
  #endif
#endif

#include <map_pars_fragment>

#ifdef USE_MAP
  uniform mat3 mapUvTransform;
#endif

// #include <alphamap_pars_fragment>

#if THREE_VRM_THREE_REVISION >= 132
  #include <alphatest_pars_fragment>
#endif

#include <aomap_pars_fragment>
// #include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>

#ifdef USE_EMISSIVEMAP
  uniform mat3 emissiveMapUvTransform;
#endif

// #include <envmap_common_pars_fragment>
// #include <envmap_pars_fragment>
// #include <cube_uv_reflection_fragment>
#include <fog_pars_fragment>

// #include <bsdfs>
// COMPAT: pre-r151 doesn't have BRDF_Lambert in <common>
#if THREE_VRM_THREE_REVISION < 151
  vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
    return RECIPROCAL_PI * diffuseColor;
  }
#endif

#include <lights_pars_begin>

#if THREE_VRM_THREE_REVISION >= 132
  #include <normal_pars_fragment>
#endif

// #include <lights_phong_pars_fragment>
varying vec3 vViewPosition;

#if THREE_VRM_THREE_REVISION < 132
  #ifndef FLAT_SHADED
    varying vec3 vNormal;
  #endif
#endif

struct MToonMaterial {
  vec3 diffuseColor;
  vec3 shadeColor;
  float shadingShift;
};

float linearstep( float a, float b, float t ) {
  return clamp( ( t - a ) / ( b - a ), 0.0, 1.0 );
}

/**
 * Convert NdotL into toon shading factor using shadingShift and shadingToony
 */
float getShading(
  const in float dotNL,
  const in float shadow,
  const in float shadingShift
) {
  float shading = dotNL;
  shading = shading + shadingShift;
  shading = linearstep( -1.0 + shadingToonyFactor, 1.0 - shadingToonyFactor, shading );
  shading *= shadow;
  return shading;
}

/**
 * Mix diffuseColor and shadeColor using shading factor and light color
 */
vec3 getDiffuse(
  const in MToonMaterial material,
  const in float shading,
  in vec3 lightColor
) {
  #ifdef DEBUG_LITSHADERATE
    return vec3( BRDF_Lambert( shading * lightColor ) );
  #endif

  #if THREE_VRM_THREE_REVISION < 132
    #ifndef PHYSICALLY_CORRECT_LIGHTS
      lightColor *= PI;
    #endif
  #endif

  vec3 col = lightColor * BRDF_Lambert( mix( material.shadeColor, material.diffuseColor, shading ) );

  // The "comment out if you want to PBR absolutely" line
  #ifdef V0_COMPAT_SHADE
    col = min( col, material.diffuseColor );
  #endif

  return col;
}

// COMPAT: pre-r156 uses a struct GeometricContext
#if THREE_VRM_THREE_REVISION >= 157
  void RE_Direct_MToon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in MToonMaterial material, const in float shadow, inout ReflectedLight reflectedLight ) {
    float dotNL = clamp( dot( geometryNormal, directLight.direction ), -1.0, 1.0 );
    vec3 irradiance = directLight.color;

    // directSpecular will be used for rim lighting, not an actual specular
    reflectedLight.directSpecular += irradiance;

    irradiance *= dotNL;

    float shading = getShading( dotNL, shadow, material.shadingShift );

    // toon shaded diffuse
    reflectedLight.directDiffuse += getDiffuse( material, shading, directLight.color );
  }

  void RE_IndirectDiffuse_MToon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in MToonMaterial material, inout ReflectedLight reflectedLight ) {
    // indirect diffuse will use diffuseColor, no shadeColor involved
    reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );

    // directSpecular will be used for rim lighting, not an actual specular
    reflectedLight.directSpecular += irradiance;
  }
#else
  void RE_Direct_MToon( const in IncidentLight directLight, const in GeometricContext geometry, const in MToonMaterial material, const in float shadow, inout ReflectedLight reflectedLight ) {
    float dotNL = clamp( dot( geometry.normal, directLight.direction ), -1.0, 1.0 );
    vec3 irradiance = directLight.color;

    #if THREE_VRM_THREE_REVISION < 132
      #ifndef PHYSICALLY_CORRECT_LIGHTS
        irradiance *= PI;
      #endif
    #endif

    // directSpecular will be used for rim lighting, not an actual specular
    reflectedLight.directSpecular += irradiance;

    irradiance *= dotNL;

    float shading = getShading( dotNL, shadow, material.shadingShift );

    // toon shaded diffuse
    reflectedLight.directDiffuse += getDiffuse( material, shading, directLight.color );
  }

  void RE_IndirectDiffuse_MToon( const in vec3 irradiance, const in GeometricContext geometry, const in MToonMaterial material, inout ReflectedLight reflectedLight ) {
    // indirect diffuse will use diffuseColor, no shadeColor involved
    reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );

    // directSpecular will be used for rim lighting, not an actual specular
    reflectedLight.directSpecular += irradiance;
  }
#endif

#define RE_Direct RE_Direct_MToon
#define RE_IndirectDiffuse RE_IndirectDiffuse_MToon
#define Material_LightProbeLOD( material ) (0)

#include <shadowmap_pars_fragment>
// #include <bumpmap_pars_fragment>

// #include <normalmap_pars_fragment>
#ifdef USE_NORMALMAP

  uniform sampler2D normalMap;
  uniform mat3 normalMapUvTransform;
  uniform vec2 normalScale;

#endif

// COMPAT: USE_NORMALMAP_OBJECTSPACE used to be OBJECTSPACE_NORMALMAP in pre-r151
#if defined( USE_NORMALMAP_OBJECTSPACE ) || defined( OBJECTSPACE_NORMALMAP )

  uniform mat3 normalMatrix;

#endif

// COMPAT: USE_NORMALMAP_TANGENTSPACE used to be TANGENTSPACE_NORMALMAP in pre-r151
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( TANGENTSPACE_NORMALMAP ) )

  // Per-Pixel Tangent Space Normal Mapping
  // http://hacksoflife.blogspot.ch/2009/11/per-pixel-tangent-space-normal-mapping.html

  // three-vrm specific change: it requires \`uv\` as an input in order to support uv scrolls

  // Temporary compat against shader change @ Three.js r126, r151
  #if THREE_VRM_THREE_REVISION >= 151

    mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {

      vec3 q0 = dFdx( eye_pos.xyz );
      vec3 q1 = dFdy( eye_pos.xyz );
      vec2 st0 = dFdx( uv.st );
      vec2 st1 = dFdy( uv.st );

      vec3 N = surf_norm;

      vec3 q1perp = cross( q1, N );
      vec3 q0perp = cross( N, q0 );

      vec3 T = q1perp * st0.x + q0perp * st1.x;
      vec3 B = q1perp * st0.y + q0perp * st1.y;

      float det = max( dot( T, T ), dot( B, B ) );
      float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );

      return mat3( T * scale, B * scale, N );

    }

  #elif THREE_VRM_THREE_REVISION >= 126

    vec3 perturbNormal2Arb( vec2 uv, vec3 eye_pos, vec3 surf_norm, vec3 mapN, float faceDirection ) {

      vec3 q0 = vec3( dFdx( eye_pos.x ), dFdx( eye_pos.y ), dFdx( eye_pos.z ) );
      vec3 q1 = vec3( dFdy( eye_pos.x ), dFdy( eye_pos.y ), dFdy( eye_pos.z ) );
      vec2 st0 = dFdx( uv.st );
      vec2 st1 = dFdy( uv.st );

      vec3 N = normalize( surf_norm );

      vec3 q1perp = cross( q1, N );
      vec3 q0perp = cross( N, q0 );

      vec3 T = q1perp * st0.x + q0perp * st1.x;
      vec3 B = q1perp * st0.y + q0perp * st1.y;

      // three-vrm specific change: Workaround for the issue that happens when delta of uv = 0.0
      // TODO: Is this still required? Or shall I make a PR about it?
      if ( length( T ) == 0.0 || length( B ) == 0.0 ) {
        return surf_norm;
      }

      float det = max( dot( T, T ), dot( B, B ) );
      float scale = ( det == 0.0 ) ? 0.0 : faceDirection * inversesqrt( det );

      return normalize( T * ( mapN.x * scale ) + B * ( mapN.y * scale ) + N * mapN.z );

    }

  #else

    vec3 perturbNormal2Arb( vec2 uv, vec3 eye_pos, vec3 surf_norm, vec3 mapN ) {

      // Workaround for Adreno 3XX dFd*( vec3 ) bug. See #9988

      vec3 q0 = vec3( dFdx( eye_pos.x ), dFdx( eye_pos.y ), dFdx( eye_pos.z ) );
      vec3 q1 = vec3( dFdy( eye_pos.x ), dFdy( eye_pos.y ), dFdy( eye_pos.z ) );
      vec2 st0 = dFdx( uv.st );
      vec2 st1 = dFdy( uv.st );

      float scale = sign( st1.t * st0.s - st0.t * st1.s ); // we do not care about the magnitude

      vec3 S = ( q0 * st1.t - q1 * st0.t ) * scale;
      vec3 T = ( - q0 * st1.s + q1 * st0.s ) * scale;

      // three-vrm specific change: Workaround for the issue that happens when delta of uv = 0.0
      // TODO: Is this still required? Or shall I make a PR about it?

      if ( length( S ) == 0.0 || length( T ) == 0.0 ) {
        return surf_norm;
      }

      S = normalize( S );
      T = normalize( T );
      vec3 N = normalize( surf_norm );

      #ifdef DOUBLE_SIDED

        // Workaround for Adreno GPUs gl_FrontFacing bug. See #15850 and #10331

        bool frontFacing = dot( cross( S, T ), N ) > 0.0;

        mapN.xy *= ( float( frontFacing ) * 2.0 - 1.0 );

      #else

        mapN.xy *= ( float( gl_FrontFacing ) * 2.0 - 1.0 );

      #endif

      mat3 tsn = mat3( S, T, N );
      return normalize( tsn * mapN );

    }

  #endif

#endif

// #include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

// == post correction ==========================================================
void postCorrection() {
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
  #include <premultiplied_alpha_fragment>
  #include <dithering_fragment>
}

// == main procedure ===========================================================
void main() {
  #include <clipping_planes_fragment>

  vec2 uv = vec2(0.5, 0.5);

  #if ( defined( MTOON_USE_UV ) && !defined( MTOON_UVS_VERTEX_ONLY ) )
    uv = vUv;

    float uvAnimMask = 1.0;
    #ifdef USE_UVANIMATIONMASKTEXTURE
      vec2 uvAnimationMaskTextureUv = ( uvAnimationMaskTextureUvTransform * vec3( uv, 1 ) ).xy;
      uvAnimMask = texture2D( uvAnimationMaskTexture, uvAnimationMaskTextureUv ).b;
    #endif

    float uvRotCos = cos( uvAnimationRotationPhase * uvAnimMask );
    float uvRotSin = sin( uvAnimationRotationPhase * uvAnimMask );
    uv = mat2( uvRotCos, -uvRotSin, uvRotSin, uvRotCos ) * ( uv - 0.5 ) + 0.5;
    uv = uv + vec2( uvAnimationScrollXOffset, uvAnimationScrollYOffset ) * uvAnimMask;
  #endif

  #ifdef DEBUG_UV
    gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
    #if ( defined( MTOON_USE_UV ) && !defined( MTOON_UVS_VERTEX_ONLY ) )
      gl_FragColor = vec4( uv, 0.0, 1.0 );
    #endif
    return;
  #endif

  vec4 diffuseColor = vec4( litFactor, opacity );
  ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
  vec3 totalEmissiveRadiance = emissive * emissiveIntensity;

  #include <logdepthbuf_fragment>

  // #include <map_fragment>
  #ifdef USE_MAP
    vec2 mapUv = ( mapUvTransform * vec3( uv, 1 ) ).xy;
    vec4 sampledDiffuseColor = texture2D( map, mapUv );
    #ifdef DECODE_VIDEO_TEXTURE
      sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
    #endif
    diffuseColor *= sampledDiffuseColor;
  #endif

  // #include <color_fragment>
  #if ( defined( USE_COLOR ) && !defined( IGNORE_VERTEX_COLOR ) )
    diffuseColor.rgb *= vColor;
  #endif

  // #include <alphamap_fragment>

  #include <alphatest_fragment>

  // #include <specularmap_fragment>

  // #include <normal_fragment_begin>
  float faceDirection = gl_FrontFacing ? 1.0 : -1.0;

  #ifdef FLAT_SHADED

    vec3 fdx = dFdx( vViewPosition );
    vec3 fdy = dFdy( vViewPosition );
    vec3 normal = normalize( cross( fdx, fdy ) );

  #else

    vec3 normal = normalize( vNormal );

    #ifdef DOUBLE_SIDED

      normal *= faceDirection;

    #endif

  #endif

  #ifdef USE_NORMALMAP

    vec2 normalMapUv = ( normalMapUvTransform * vec3( uv, 1 ) ).xy;

  #endif

  #ifdef USE_NORMALMAP_TANGENTSPACE

    #ifdef USE_TANGENT

      mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );

    #else

      mat3 tbn = getTangentFrame( - vViewPosition, normal, normalMapUv );

    #endif

    #if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )

      tbn[0] *= faceDirection;
      tbn[1] *= faceDirection;

    #endif

  #endif

  #ifdef USE_CLEARCOAT_NORMALMAP

    #ifdef USE_TANGENT

      mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );

    #else

      mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );

    #endif

    #if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )

      tbn2[0] *= faceDirection;
      tbn2[1] *= faceDirection;

    #endif

  #endif

  // non perturbed normal for clearcoat among others

  vec3 nonPerturbedNormal = normal;

  #ifdef OUTLINE
    normal *= -1.0;
  #endif

  // #include <normal_fragment_maps>

  // COMPAT: USE_NORMALMAP_OBJECTSPACE used to be OBJECTSPACE_NORMALMAP in pre-r151
  #if defined( USE_NORMALMAP_OBJECTSPACE ) || defined( OBJECTSPACE_NORMALMAP )

    normal = texture2D( normalMap, normalMapUv ).xyz * 2.0 - 1.0; // overrides both flatShading and attribute normals

    #ifdef FLIP_SIDED

      normal = - normal;

    #endif

    #ifdef DOUBLE_SIDED

      // Temporary compat against shader change @ Three.js r126
      // See: #21205, #21307, #21299
      #if THREE_VRM_THREE_REVISION >= 126

        normal = normal * faceDirection;

      #else

        normal = normal * ( float( gl_FrontFacing ) * 2.0 - 1.0 );

      #endif

    #endif

    normal = normalize( normalMatrix * normal );

  // COMPAT: USE_NORMALMAP_TANGENTSPACE used to be TANGENTSPACE_NORMALMAP in pre-r151
  #elif defined( USE_NORMALMAP_TANGENTSPACE ) || defined( TANGENTSPACE_NORMALMAP )

    vec3 mapN = texture2D( normalMap, normalMapUv ).xyz * 2.0 - 1.0;
    mapN.xy *= normalScale;

    // COMPAT: pre-r151
    #if THREE_VRM_THREE_REVISION >= 151 || defined( USE_TANGENT )

      normal = normalize( tbn * mapN );

    #else

      // pre-r126
      #if THREE_VRM_THREE_REVISION >= 126

        normal = perturbNormal2Arb( uv, -vViewPosition, normal, mapN, faceDirection );

      #else

        normal = perturbNormal2Arb( uv, -vViewPosition, normal, mapN );

      #endif

    #endif

  #endif

  // #include <emissivemap_fragment>
  #ifdef USE_EMISSIVEMAP
    vec2 emissiveMapUv = ( emissiveMapUvTransform * vec3( uv, 1 ) ).xy;
    totalEmissiveRadiance *= texture2D( emissiveMap, emissiveMapUv ).rgb;
  #endif

  #ifdef DEBUG_NORMAL
    gl_FragColor = vec4( 0.5 + 0.5 * normal, 1.0 );
    return;
  #endif

  // -- MToon: lighting --------------------------------------------------------
  // accumulation
  // #include <lights_phong_fragment>
  MToonMaterial material;

  material.diffuseColor = diffuseColor.rgb;

  material.shadeColor = shadeColorFactor;
  #ifdef USE_SHADEMULTIPLYTEXTURE
    vec2 shadeMultiplyTextureUv = ( shadeMultiplyTextureUvTransform * vec3( uv, 1 ) ).xy;
    material.shadeColor *= texture2D( shadeMultiplyTexture, shadeMultiplyTextureUv ).rgb;
  #endif

  #if ( defined( USE_COLOR ) && !defined( IGNORE_VERTEX_COLOR ) )
    material.shadeColor.rgb *= vColor;
  #endif

  material.shadingShift = shadingShiftFactor;
  #ifdef USE_SHADINGSHIFTTEXTURE
    vec2 shadingShiftTextureUv = ( shadingShiftTextureUvTransform * vec3( uv, 1 ) ).xy;
    material.shadingShift += texture2D( shadingShiftTexture, shadingShiftTextureUv ).r * shadingShiftTextureScale;
  #endif

  // #include <lights_fragment_begin>

  // MToon Specific changes:
  // Since we want to take shadows into account of shading instead of irradiance,
  // we had to modify the codes that multiplies the results of shadowmap into color of direct lights.

  // COMPAT: pre-r156 uses a struct GeometricContext
  #if THREE_VRM_THREE_REVISION >= 157
    vec3 geometryPosition = - vViewPosition;
    vec3 geometryNormal = normal;
    vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );

    vec3 geometryClearcoatNormal;

    #ifdef USE_CLEARCOAT

      geometryClearcoatNormal = clearcoatNormal;

    #endif
  #else
    GeometricContext geometry;

    geometry.position = - vViewPosition;
    geometry.normal = normal;
    geometry.viewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );

    #ifdef USE_CLEARCOAT

      geometry.clearcoatNormal = clearcoatNormal;

    #endif
  #endif

  IncidentLight directLight;

  // since these variables will be used in unrolled loop, we have to define in prior
  float shadow;

  #if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )

    PointLight pointLight;
    #if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
    PointLightShadow pointLightShadow;
    #endif

    #pragma unroll_loop_start
    for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {

      pointLight = pointLights[ i ];

      // COMPAT: pre-r156 uses a struct GeometricContext
      #if THREE_VRM_THREE_REVISION >= 157
        getPointLightInfo( pointLight, geometryPosition, directLight );
      #elif THREE_VRM_THREE_REVISION >= 132
        getPointLightInfo( pointLight, geometry, directLight );
      #else
        getPointDirectLightIrradiance( pointLight, geometry, directLight );
      #endif

      shadow = 1.0;
      #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
      pointLightShadow = pointLightShadows[ i ];
      // COMPAT: pre-r166
      // r166 introduced shadowIntensity
      #if THREE_VRM_THREE_REVISION >= 166
        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
      #else
        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
      #endif
      #endif

      // COMPAT: pre-r156 uses a struct GeometricContext
      #if THREE_VRM_THREE_REVISION >= 157
        RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, shadow, reflectedLight );
      #else
        RE_Direct( directLight, geometry, material, shadow, reflectedLight );
      #endif

    }
    #pragma unroll_loop_end

  #endif

  #if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )

    SpotLight spotLight;
    #if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
    SpotLightShadow spotLightShadow;
    #endif

    #pragma unroll_loop_start
    for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {

      spotLight = spotLights[ i ];

      // COMPAT: pre-r156 uses a struct GeometricContext
      #if THREE_VRM_THREE_REVISION >= 157
        getSpotLightInfo( spotLight, geometryPosition, directLight );
      #elif THREE_VRM_THREE_REVISION >= 132
        getSpotLightInfo( spotLight, geometry, directLight );
      #else
        getSpotDirectLightIrradiance( spotLight, geometry, directLight );
      #endif

      shadow = 1.0;
      #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
      spotLightShadow = spotLightShadows[ i ];
      // COMPAT: pre-r166
      // r166 introduced shadowIntensity
      #if THREE_VRM_THREE_REVISION >= 166
        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotShadowCoord[ i ] ) : 1.0;
      #else
        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotShadowCoord[ i ] ) : 1.0;
      #endif
      #endif

      // COMPAT: pre-r156 uses a struct GeometricContext
      #if THREE_VRM_THREE_REVISION >= 157
        RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, shadow, reflectedLight );
      #else
        RE_Direct( directLight, geometry, material, shadow, reflectedLight );
      #endif

    }
    #pragma unroll_loop_end

  #endif

  #if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )

    DirectionalLight directionalLight;
    #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
    DirectionalLightShadow directionalLightShadow;
    #endif

    #pragma unroll_loop_start
    for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {

      directionalLight = directionalLights[ i ];

      // COMPAT: pre-r156 uses a struct GeometricContext
      #if THREE_VRM_THREE_REVISION >= 157
        getDirectionalLightInfo( directionalLight, directLight );
      #elif THREE_VRM_THREE_REVISION >= 132
        getDirectionalLightInfo( directionalLight, geometry, directLight );
      #else
        getDirectionalDirectLightIrradiance( directionalLight, geometry, directLight );
      #endif

      shadow = 1.0;
      #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
      directionalLightShadow = directionalLightShadows[ i ];
      // COMPAT: pre-r166
      // r166 introduced shadowIntensity
      #if THREE_VRM_THREE_REVISION >= 166
        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
      #else
        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
      #endif
      #endif

      // COMPAT: pre-r156 uses a struct GeometricContext
      #if THREE_VRM_THREE_REVISION >= 157
        RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, shadow, reflectedLight );
      #else
        RE_Direct( directLight, geometry, material, shadow, reflectedLight );
      #endif

    }
    #pragma unroll_loop_end

  #endif

  // #if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )

  //   RectAreaLight rectAreaLight;

  //   #pragma unroll_loop_start
  //   for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {

  //     rectAreaLight = rectAreaLights[ i ];
  //     RE_Direct_RectArea( rectAreaLight, geometry, material, reflectedLight );

  //   }
  //   #pragma unroll_loop_end

  // #endif

  #if defined( RE_IndirectDiffuse )

    vec3 iblIrradiance = vec3( 0.0 );

    vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );

    // COMPAT: pre-r156 uses a struct GeometricContext
    // COMPAT: pre-r156 doesn't have a define USE_LIGHT_PROBES
    #if THREE_VRM_THREE_REVISION >= 157
      #if defined( USE_LIGHT_PROBES )
        irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
      #endif
    #elif THREE_VRM_THREE_REVISION >= 133
      irradiance += getLightProbeIrradiance( lightProbe, geometry.normal );
    #else
      irradiance += getLightProbeIrradiance( lightProbe, geometry );
    #endif

    #if ( NUM_HEMI_LIGHTS > 0 )

      #pragma unroll_loop_start
      for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {

        // COMPAT: pre-r156 uses a struct GeometricContext
        #if THREE_VRM_THREE_REVISION >= 157
          irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
        #elif THREE_VRM_THREE_REVISION >= 133
          irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry.normal );
        #else
          irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry );
        #endif

      }
      #pragma unroll_loop_end

    #endif

  #endif

  // #if defined( RE_IndirectSpecular )

  //   vec3 radiance = vec3( 0.0 );
  //   vec3 clearcoatRadiance = vec3( 0.0 );

  // #endif

  #include <lights_fragment_maps>
  #include <lights_fragment_end>

  // modulation
  #include <aomap_fragment>

  vec3 col = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;

  #ifdef DEBUG_LITSHADERATE
    gl_FragColor = vec4( col, diffuseColor.a );
    postCorrection();
    return;
  #endif

  // -- MToon: rim lighting -----------------------------------------
  vec3 viewDir = normalize( vViewPosition );

  #ifndef PHYSICALLY_CORRECT_LIGHTS
    reflectedLight.directSpecular /= PI;
  #endif
  vec3 rimMix = mix( vec3( 1.0 ), reflectedLight.directSpecular, 1.0 );

  vec3 rim = parametricRimColorFactor * pow( saturate( 1.0 - dot( viewDir, normal ) + parametricRimLiftFactor ), parametricRimFresnelPowerFactor );

  #ifdef USE_MATCAPTEXTURE
    {
      vec3 x = normalize( vec3( viewDir.z, 0.0, -viewDir.x ) );
      vec3 y = cross( viewDir, x ); // guaranteed to be normalized
      vec2 sphereUv = 0.5 + 0.5 * vec2( dot( x, normal ), -dot( y, normal ) );
      sphereUv = ( matcapTextureUvTransform * vec3( sphereUv, 1 ) ).xy;
      vec3 matcap = texture2D( matcapTexture, sphereUv ).rgb;
      rim += matcapFactor * matcap;
    }
  #endif

  #ifdef USE_RIMMULTIPLYTEXTURE
    vec2 rimMultiplyTextureUv = ( rimMultiplyTextureUvTransform * vec3( uv, 1 ) ).xy;
    rim *= texture2D( rimMultiplyTexture, rimMultiplyTextureUv ).rgb;
  #endif

  col += rimMix * rim;

  // -- MToon: Emission --------------------------------------------------------
  col += totalEmissiveRadiance;

  // #include <envmap_fragment>

  // -- Almost done! -----------------------------------------------------------
  #if defined( OUTLINE )
    col = outlineColorFactor.rgb * mix( vec3( 1.0 ), col, outlineLightingMixFactor );
  #endif

  #ifdef OPAQUE
    diffuseColor.a = 1.0;
  #endif

  gl_FragColor = vec4( col, diffuseColor.a );
  postCorrection();
}
`;const ro={None:"none"},ft={None:"none",WorldCoordinates:"worldCoordinates",ScreenCoordinates:"screenCoordinates"},so={3e3:"",3001:"srgb"};function mt(d){return parseInt($,10)>=152?d.colorSpace:so[d.encoding]}class _t extends _i{get color(){return this.uniforms.litFactor.value}set color(e){this.uniforms.litFactor.value=e}get map(){return this.uniforms.map.value}set map(e){this.uniforms.map.value=e}get normalMap(){return this.uniforms.normalMap.value}set normalMap(e){this.uniforms.normalMap.value=e}get normalScale(){return this.uniforms.normalScale.value}set normalScale(e){this.uniforms.normalScale.value=e}get emissive(){return this.uniforms.emissive.value}set emissive(e){this.uniforms.emissive.value=e}get emissiveIntensity(){return this.uniforms.emissiveIntensity.value}set emissiveIntensity(e){this.uniforms.emissiveIntensity.value=e}get emissiveMap(){return this.uniforms.emissiveMap.value}set emissiveMap(e){this.uniforms.emissiveMap.value=e}get shadeColorFactor(){return this.uniforms.shadeColorFactor.value}set shadeColorFactor(e){this.uniforms.shadeColorFactor.value=e}get shadeMultiplyTexture(){return this.uniforms.shadeMultiplyTexture.value}set shadeMultiplyTexture(e){this.uniforms.shadeMultiplyTexture.value=e}get shadingShiftFactor(){return this.uniforms.shadingShiftFactor.value}set shadingShiftFactor(e){this.uniforms.shadingShiftFactor.value=e}get shadingShiftTexture(){return this.uniforms.shadingShiftTexture.value}set shadingShiftTexture(e){this.uniforms.shadingShiftTexture.value=e}get shadingShiftTextureScale(){return this.uniforms.shadingShiftTextureScale.value}set shadingShiftTextureScale(e){this.uniforms.shadingShiftTextureScale.value=e}get shadingToonyFactor(){return this.uniforms.shadingToonyFactor.value}set shadingToonyFactor(e){this.uniforms.shadingToonyFactor.value=e}get giEqualizationFactor(){return this.uniforms.giEqualizationFactor.value}set giEqualizationFactor(e){this.uniforms.giEqualizationFactor.value=e}get matcapFactor(){return this.uniforms.matcapFactor.value}set matcapFactor(e){this.uniforms.matcapFactor.value=e}get matcapTexture(){return this.uniforms.matcapTexture.value}set matcapTexture(e){this.uniforms.matcapTexture.value=e}get parametricRimColorFactor(){return this.uniforms.parametricRimColorFactor.value}set parametricRimColorFactor(e){this.uniforms.parametricRimColorFactor.value=e}get rimMultiplyTexture(){return this.uniforms.rimMultiplyTexture.value}set rimMultiplyTexture(e){this.uniforms.rimMultiplyTexture.value=e}get rimLightingMixFactor(){return this.uniforms.rimLightingMixFactor.value}set rimLightingMixFactor(e){this.uniforms.rimLightingMixFactor.value=e}get parametricRimFresnelPowerFactor(){return this.uniforms.parametricRimFresnelPowerFactor.value}set parametricRimFresnelPowerFactor(e){this.uniforms.parametricRimFresnelPowerFactor.value=e}get parametricRimLiftFactor(){return this.uniforms.parametricRimLiftFactor.value}set parametricRimLiftFactor(e){this.uniforms.parametricRimLiftFactor.value=e}get outlineWidthMultiplyTexture(){return this.uniforms.outlineWidthMultiplyTexture.value}set outlineWidthMultiplyTexture(e){this.uniforms.outlineWidthMultiplyTexture.value=e}get outlineWidthFactor(){return this.uniforms.outlineWidthFactor.value}set outlineWidthFactor(e){this.uniforms.outlineWidthFactor.value=e}get outlineColorFactor(){return this.uniforms.outlineColorFactor.value}set outlineColorFactor(e){this.uniforms.outlineColorFactor.value=e}get outlineLightingMixFactor(){return this.uniforms.outlineLightingMixFactor.value}set outlineLightingMixFactor(e){this.uniforms.outlineLightingMixFactor.value=e}get uvAnimationMaskTexture(){return this.uniforms.uvAnimationMaskTexture.value}set uvAnimationMaskTexture(e){this.uniforms.uvAnimationMaskTexture.value=e}get uvAnimationScrollXOffset(){return this.uniforms.uvAnimationScrollXOffset.value}set uvAnimationScrollXOffset(e){this.uniforms.uvAnimationScrollXOffset.value=e}get uvAnimationScrollYOffset(){return this.uniforms.uvAnimationScrollYOffset.value}set uvAnimationScrollYOffset(e){this.uniforms.uvAnimationScrollYOffset.value=e}get uvAnimationRotationPhase(){return this.uniforms.uvAnimationRotationPhase.value}set uvAnimationRotationPhase(e){this.uniforms.uvAnimationRotationPhase.value=e}get ignoreVertexColor(){return this._ignoreVertexColor}set ignoreVertexColor(e){this._ignoreVertexColor=e,this.needsUpdate=!0}get v0CompatShade(){return this._v0CompatShade}set v0CompatShade(e){this._v0CompatShade=e,this.needsUpdate=!0}get debugMode(){return this._debugMode}set debugMode(e){this._debugMode=e,this.needsUpdate=!0}get outlineWidthMode(){return this._outlineWidthMode}set outlineWidthMode(e){this._outlineWidthMode=e,this.needsUpdate=!0}get isOutline(){return this._isOutline}set isOutline(e){this._isOutline=e,this.needsUpdate=!0}get isMToonMaterial(){return!0}constructor(e={}){var t;super({vertexShader:io,fragmentShader:oo}),this.uvAnimationScrollXSpeedFactor=0,this.uvAnimationScrollYSpeedFactor=0,this.uvAnimationRotationSpeedFactor=0,this.fog=!0,this.normalMapType=vi,this._ignoreVertexColor=!0,this._v0CompatShade=!1,this._debugMode=ro.None,this._outlineWidthMode=ft.None,this._isOutline=!1,e.transparentWithZWrite&&(e.depthWrite=!0),delete e.transparentWithZWrite,e.fog=!0,e.lights=!0,e.clipping=!0,parseInt($,10)<129&&(e.skinning=e.skinning||!1),parseInt($,10)<131&&(e.morphTargets=e.morphTargets||!1,e.morphNormals=e.morphNormals||!1),this.uniforms=gi.merge([ae.common,ae.normalmap,ae.emissivemap,ae.fog,ae.lights,{litFactor:{value:new C(1,1,1)},mapUvTransform:{value:new F},colorAlpha:{value:1},normalMapUvTransform:{value:new F},shadeColorFactor:{value:new C(0,0,0)},shadeMultiplyTexture:{value:null},shadeMultiplyTextureUvTransform:{value:new F},shadingShiftFactor:{value:0},shadingShiftTexture:{value:null},shadingShiftTextureUvTransform:{value:new F},shadingShiftTextureScale:{value:1},shadingToonyFactor:{value:.9},giEqualizationFactor:{value:.9},matcapFactor:{value:new C(1,1,1)},matcapTexture:{value:null},matcapTextureUvTransform:{value:new F},parametricRimColorFactor:{value:new C(0,0,0)},rimMultiplyTexture:{value:null},rimMultiplyTextureUvTransform:{value:new F},rimLightingMixFactor:{value:1},parametricRimFresnelPowerFactor:{value:5},parametricRimLiftFactor:{value:0},emissive:{value:new C(0,0,0)},emissiveIntensity:{value:1},emissiveMapUvTransform:{value:new F},outlineWidthMultiplyTexture:{value:null},outlineWidthMultiplyTextureUvTransform:{value:new F},outlineWidthFactor:{value:0},outlineColorFactor:{value:new C(0,0,0)},outlineLightingMixFactor:{value:1},uvAnimationMaskTexture:{value:null},uvAnimationMaskTextureUvTransform:{value:new F},uvAnimationScrollXOffset:{value:0},uvAnimationScrollYOffset:{value:0},uvAnimationRotationPhase:{value:0}},(t=e.uniforms)!==null&&t!==void 0?t:{}]),this.setValues(e),this._uploadUniformsWorkaround(),this.customProgramCacheKey=()=>[...Object.entries(this._generateDefines()).map(([n,i])=>`${n}:${i}`),this.matcapTexture?`matcapTextureColorSpace:${mt(this.matcapTexture)}`:"",this.shadeMultiplyTexture?`shadeMultiplyTextureColorSpace:${mt(this.shadeMultiplyTexture)}`:"",this.rimMultiplyTexture?`rimMultiplyTextureColorSpace:${mt(this.rimMultiplyTexture)}`:""].join(","),this.onBeforeCompile=n=>{const i=parseInt($,10),o=Object.entries(Object.assign(Object.assign({},this._generateDefines()),this.defines)).filter(([r,s])=>!!s).map(([r,s])=>`#define ${r} ${s}`).join(`
`)+`
`;n.vertexShader=o+n.vertexShader,n.fragmentShader=o+n.fragmentShader,i<154&&(n.fragmentShader=n.fragmentShader.replace("#include <colorspace_fragment>","#include <encodings_fragment>")),i<132&&(n.fragmentShader=n.fragmentShader.replace("#include <normal_pars_fragment>",""),n.fragmentShader=n.fragmentShader.replace("#include <alphatest_pars_fragment>",""))}}update(e){this._uploadUniformsWorkaround(),this._updateUVAnimation(e)}copy(e){return super.copy(e),this.map=e.map,this.normalMap=e.normalMap,this.emissiveMap=e.emissiveMap,this.shadeMultiplyTexture=e.shadeMultiplyTexture,this.shadingShiftTexture=e.shadingShiftTexture,this.matcapTexture=e.matcapTexture,this.rimMultiplyTexture=e.rimMultiplyTexture,this.outlineWidthMultiplyTexture=e.outlineWidthMultiplyTexture,this.uvAnimationMaskTexture=e.uvAnimationMaskTexture,this.normalMapType=e.normalMapType,this.uvAnimationScrollXSpeedFactor=e.uvAnimationScrollXSpeedFactor,this.uvAnimationScrollYSpeedFactor=e.uvAnimationScrollYSpeedFactor,this.uvAnimationRotationSpeedFactor=e.uvAnimationRotationSpeedFactor,this.ignoreVertexColor=e.ignoreVertexColor,this.v0CompatShade=e.v0CompatShade,this.debugMode=e.debugMode,this.outlineWidthMode=e.outlineWidthMode,this.isOutline=e.isOutline,this.needsUpdate=!0,this}_updateUVAnimation(e){this.uniforms.uvAnimationScrollXOffset.value+=e*this.uvAnimationScrollXSpeedFactor,this.uniforms.uvAnimationScrollYOffset.value+=e*this.uvAnimationScrollYSpeedFactor,this.uniforms.uvAnimationRotationPhase.value+=e*this.uvAnimationRotationSpeedFactor,this.uniformsNeedUpdate=!0}_uploadUniformsWorkaround(){this.uniforms.opacity.value=this.opacity,this._updateTextureMatrix(this.uniforms.map,this.uniforms.mapUvTransform),this._updateTextureMatrix(this.uniforms.normalMap,this.uniforms.normalMapUvTransform),this._updateTextureMatrix(this.uniforms.emissiveMap,this.uniforms.emissiveMapUvTransform),this._updateTextureMatrix(this.uniforms.shadeMultiplyTexture,this.uniforms.shadeMultiplyTextureUvTransform),this._updateTextureMatrix(this.uniforms.shadingShiftTexture,this.uniforms.shadingShiftTextureUvTransform),this._updateTextureMatrix(this.uniforms.matcapTexture,this.uniforms.matcapTextureUvTransform),this._updateTextureMatrix(this.uniforms.rimMultiplyTexture,this.uniforms.rimMultiplyTextureUvTransform),this._updateTextureMatrix(this.uniforms.outlineWidthMultiplyTexture,this.uniforms.outlineWidthMultiplyTextureUvTransform),this._updateTextureMatrix(this.uniforms.uvAnimationMaskTexture,this.uniforms.uvAnimationMaskTextureUvTransform),parseInt($,10)>=132&&(this.uniforms.alphaTest.value=this.alphaTest),this.uniformsNeedUpdate=!0}_generateDefines(){const e=parseInt($,10),t=this.outlineWidthMultiplyTexture!==null,n=this.map!==null||this.normalMap!==null||this.emissiveMap!==null||this.shadeMultiplyTexture!==null||this.shadingShiftTexture!==null||this.rimMultiplyTexture!==null||this.uvAnimationMaskTexture!==null;return{THREE_VRM_THREE_REVISION:e,OUTLINE:this._isOutline,MTOON_USE_UV:t||n,MTOON_UVS_VERTEX_ONLY:t&&!n,V0_COMPAT_SHADE:this._v0CompatShade,USE_SHADEMULTIPLYTEXTURE:this.shadeMultiplyTexture!==null,USE_SHADINGSHIFTTEXTURE:this.shadingShiftTexture!==null,USE_MATCAPTEXTURE:this.matcapTexture!==null,USE_RIMMULTIPLYTEXTURE:this.rimMultiplyTexture!==null,USE_OUTLINEWIDTHMULTIPLYTEXTURE:this._isOutline&&this.outlineWidthMultiplyTexture!==null,USE_UVANIMATIONMASKTEXTURE:this.uvAnimationMaskTexture!==null,IGNORE_VERTEX_COLOR:this._ignoreVertexColor===!0,DEBUG_NORMAL:this._debugMode==="normal",DEBUG_LITSHADERATE:this._debugMode==="litShadeRate",DEBUG_UV:this._debugMode==="uv",OUTLINE_WIDTH_WORLD:this._isOutline&&this._outlineWidthMode===ft.WorldCoordinates,OUTLINE_WIDTH_SCREEN:this._isOutline&&this._outlineWidthMode===ft.ScreenCoordinates}}_updateTextureMatrix(e,t){e.value&&(e.value.matrixAutoUpdate&&e.value.updateMatrix(),t.value.copy(e.value.matrix))}}const ao={"":3e3,srgb:3001};function lo(d,e){parseInt($,10)>=152?d.colorSpace=e:d.encoding=ao[e]}class uo{get pending(){return Promise.all(this._pendings)}constructor(e,t){this._parser=e,this._materialParams=t,this._pendings=[]}assignPrimitive(e,t){t!=null&&(this._materialParams[e]=t)}assignColor(e,t,n){t!=null&&(this._materialParams[e]=new C().fromArray(t),n&&this._materialParams[e].convertSRGBToLinear())}assignTexture(e,t,n){return X(this,void 0,void 0,function*(){const i=X(this,void 0,void 0,function*(){t!=null&&(yield this._parser.assignTexture(this._materialParams,e,t),n&&lo(this._materialParams[e],"srgb"))});return this._pendings.push(i),i})}assignTextureByIndex(e,t,n){return X(this,void 0,void 0,function*(){return this.assignTexture(e,t!=null?{index:t}:void 0,n)})}}const co=new Set(["1.0","1.0-beta"]);class oe{get name(){return oe.EXTENSION_NAME}constructor(e,t={}){var n,i,o;this.parser=e,this.renderOrderOffset=(n=t.renderOrderOffset)!==null&&n!==void 0?n:0,this.v0CompatShade=(i=t.v0CompatShade)!==null&&i!==void 0?i:!1,this.debugMode=(o=t.debugMode)!==null&&o!==void 0?o:"none",this._mToonMaterialSet=new Set}beforeRoot(){return X(this,void 0,void 0,function*(){this._removeUnlitExtensionIfMToonExists()})}afterRoot(e){return X(this,void 0,void 0,function*(){e.userData.vrmMToonMaterials=Array.from(this._mToonMaterialSet)})}getMaterialType(e){return this._getMToonExtension(e)?_t:null}extendMaterialParams(e,t){const n=this._getMToonExtension(e);return n?this._extendMaterialParams(n,t):null}loadMesh(e){var t;return X(this,void 0,void 0,function*(){const n=this.parser,o=(t=n.json.meshes)===null||t===void 0?void 0:t[e];if(o==null)throw new Error(`MToonMaterialLoaderPlugin: Attempt to use meshes[${e}] of glTF but the mesh doesn't exist`);const r=o.primitives,s=yield n.loadMesh(e);if(r.length===1){const a=s,l=r[0].material;l!=null&&this._setupPrimitive(a,l)}else{const a=s;for(let l=0;l<r.length;l++){const u=a.children[l],c=r[l].material;c!=null&&this._setupPrimitive(u,c)}}return s})}_removeUnlitExtensionIfMToonExists(){const n=this.parser.json.materials;n==null||n.map((i,o)=>{var r;this._getMToonExtension(o)&&(!((r=i.extensions)===null||r===void 0)&&r.KHR_materials_unlit)&&delete i.extensions.KHR_materials_unlit})}_getMToonExtension(e){var t,n;const r=(t=this.parser.json.materials)===null||t===void 0?void 0:t[e];if(r==null){console.warn(`MToonMaterialLoaderPlugin: Attempt to use materials[${e}] of glTF but the material doesn't exist`);return}const s=(n=r.extensions)===null||n===void 0?void 0:n[oe.EXTENSION_NAME];if(s==null)return;const a=s.specVersion;if(!co.has(a)){console.warn(`MToonMaterialLoaderPlugin: Unknown ${oe.EXTENSION_NAME} specVersion "${a}"`);return}return s}_extendMaterialParams(e,t){var n;return X(this,void 0,void 0,function*(){delete t.metalness,delete t.roughness;const i=new uo(this.parser,t);i.assignPrimitive("transparentWithZWrite",e.transparentWithZWrite),i.assignColor("shadeColorFactor",e.shadeColorFactor),i.assignTexture("shadeMultiplyTexture",e.shadeMultiplyTexture,!0),i.assignPrimitive("shadingShiftFactor",e.shadingShiftFactor),i.assignTexture("shadingShiftTexture",e.shadingShiftTexture,!0),i.assignPrimitive("shadingShiftTextureScale",(n=e.shadingShiftTexture)===null||n===void 0?void 0:n.scale),i.assignPrimitive("shadingToonyFactor",e.shadingToonyFactor),i.assignPrimitive("giEqualizationFactor",e.giEqualizationFactor),i.assignColor("matcapFactor",e.matcapFactor),i.assignTexture("matcapTexture",e.matcapTexture,!0),i.assignColor("parametricRimColorFactor",e.parametricRimColorFactor),i.assignTexture("rimMultiplyTexture",e.rimMultiplyTexture,!0),i.assignPrimitive("rimLightingMixFactor",e.rimLightingMixFactor),i.assignPrimitive("parametricRimFresnelPowerFactor",e.parametricRimFresnelPowerFactor),i.assignPrimitive("parametricRimLiftFactor",e.parametricRimLiftFactor),i.assignPrimitive("outlineWidthMode",e.outlineWidthMode),i.assignPrimitive("outlineWidthFactor",e.outlineWidthFactor),i.assignTexture("outlineWidthMultiplyTexture",e.outlineWidthMultiplyTexture,!1),i.assignColor("outlineColorFactor",e.outlineColorFactor),i.assignPrimitive("outlineLightingMixFactor",e.outlineLightingMixFactor),i.assignTexture("uvAnimationMaskTexture",e.uvAnimationMaskTexture,!1),i.assignPrimitive("uvAnimationScrollXSpeedFactor",e.uvAnimationScrollXSpeedFactor),i.assignPrimitive("uvAnimationScrollYSpeedFactor",e.uvAnimationScrollYSpeedFactor),i.assignPrimitive("uvAnimationRotationSpeedFactor",e.uvAnimationRotationSpeedFactor),i.assignPrimitive("v0CompatShade",this.v0CompatShade),i.assignPrimitive("debugMode",this.debugMode),yield i.pending})}_setupPrimitive(e,t){const n=this._getMToonExtension(t);if(n){const i=this._parseRenderOrder(n);e.renderOrder=i+this.renderOrderOffset,this._generateOutline(e),this._addToMaterialSet(e);return}}_generateOutline(e){const t=e.material;if(!(t instanceof _t)||t.outlineWidthMode==="none"||t.outlineWidthFactor<=0)return;e.material=[t];const n=t.clone();n.name+=" (Outline)",n.isOutline=!0,n.side=fi,e.material.push(n);const i=e.geometry,o=i.index?i.index.count:i.attributes.position.count/3;i.addGroup(0,o,0),i.addGroup(0,o,1)}_addToMaterialSet(e){const t=e.material,n=new Set;Array.isArray(t)?t.forEach(i=>n.add(i)):n.add(t);for(const i of n)i instanceof _t&&this._mToonMaterialSet.add(i)}_parseRenderOrder(e){var t;return(e.transparentWithZWrite?0:19)+((t=e.renderQueueOffsetNumber)!==null&&t!==void 0?t:0)}}oe.EXTENSION_NAME="VRMC_materials_mtoon";/*!
 * @pixiv/three-vrm-materials-hdr-emissive-multiplier v2.1.3
 * Support VRMC_hdr_emissiveMultiplier for @pixiv/three-vrm
 *
 * Copyright (c) 2020-2024 pixiv Inc.
 * @pixiv/three-vrm-materials-hdr-emissive-multiplier is distributed under MIT License
 * https://github.com/pixiv/three-vrm/blob/release/LICENSE
 */function ho(d,e,t,n){function i(o){return o instanceof t?o:new t(function(r){r(o)})}return new(t||(t=Promise))(function(o,r){function s(u){try{l(n.next(u))}catch(c){r(c)}}function a(u){try{l(n.throw(u))}catch(c){r(c)}}function l(u){u.done?o(u.value):i(u.value).then(s,a)}l((n=n.apply(d,[])).next())})}class _e{get name(){return _e.EXTENSION_NAME}constructor(e){this.parser=e}extendMaterialParams(e,t){return ho(this,void 0,void 0,function*(){const n=this._getHDREmissiveMultiplierExtension(e);if(n==null)return;console.warn("VRMMaterialsHDREmissiveMultiplierLoaderPlugin: `VRMC_materials_hdr_emissiveMultiplier` is archived. Use `KHR_materials_emissive_strength` instead.");const i=n.emissiveMultiplier;t.emissiveIntensity=i})}_getHDREmissiveMultiplierExtension(e){var t,n;const r=(t=this.parser.json.materials)===null||t===void 0?void 0:t[e];if(r==null){console.warn(`VRMMaterialsHDREmissiveMultiplierLoaderPlugin: Attempt to use materials[${e}] of glTF but the material doesn't exist`);return}const s=(n=r.extensions)===null||n===void 0?void 0:n[_e.EXTENSION_NAME];if(s!=null)return s}}_e.EXTENSION_NAME="VRMC_materials_hdr_emissiveMultiplier";/*!
 * @pixiv/three-vrm-materials-v0compat v2.1.3
 * VRM0.0 materials compatibility layer plugin for @pixiv/three-vrm
 *
 * Copyright (c) 2020-2024 pixiv Inc.
 * @pixiv/three-vrm-materials-v0compat is distributed under MIT License
 * https://github.com/pixiv/three-vrm/blob/release/LICENSE
 */function po(d,e,t,n){function i(o){return o instanceof t?o:new t(function(r){r(o)})}return new(t||(t=Promise))(function(o,r){function s(u){try{l(n.next(u))}catch(c){r(c)}}function a(u){try{l(n.throw(u))}catch(c){r(c)}}function l(u){u.done?o(u.value):i(u.value).then(s,a)}l((n=n.apply(d,[])).next())})}function ee(d){return Math.pow(d,2.2)}class fo{get name(){return"VRMMaterialsV0CompatPlugin"}constructor(e){var t;this.parser=e,this._renderQueueMapTransparent=new Map,this._renderQueueMapTransparentZWrite=new Map;const n=this.parser.json;n.extensionsUsed=(t=n.extensionsUsed)!==null&&t!==void 0?t:[],n.extensionsUsed.indexOf("KHR_texture_transform")===-1&&n.extensionsUsed.push("KHR_texture_transform")}beforeRoot(){var e;return po(this,void 0,void 0,function*(){const t=this.parser.json,n=(e=t.extensions)===null||e===void 0?void 0:e.VRM,i=n==null?void 0:n.materialProperties;i&&(this._populateRenderQueueMap(i),i.forEach((o,r)=>{var s,a;const l=(s=t.materials)===null||s===void 0?void 0:s[r];if(l==null){console.warn(`VRMMaterialsV0CompatPlugin: Attempt to use materials[${r}] of glTF but the material doesn't exist`);return}if(o.shader==="VRM/MToon"){const u=this._parseV0MToonProperties(o,l);t.materials[r]=u}else if(!((a=o.shader)===null||a===void 0)&&a.startsWith("VRM/Unlit")){const u=this._parseV0UnlitProperties(o,l);t.materials[r]=u}else o.shader==="VRM_USE_GLTFSHADER"||console.warn(`VRMMaterialsV0CompatPlugin: Unknown shader: ${o.shader}`)}))})}_parseV0MToonProperties(e,t){var n,i,o,r,s,a,l,u,c,f,h,m,p,g,v,M,y,x,T,R,w,I,A,L,b,k,J,Ce,Oe,Ve,De,Fe,Be,He,ke,We,$e,ze,je,qe,Qe,Xe,Ye,Ge,Ze,Je,Ke,et,tt,nt,it,ot,rt,st,at;const It=(i=(n=e.keywordMap)===null||n===void 0?void 0:n._ALPHABLEND_ON)!==null&&i!==void 0?i:!1,Fn=((o=e.floatProperties)===null||o===void 0?void 0:o._ZWrite)===1&&It,Bn=this._v0ParseRenderQueue(e),bt=(s=(r=e.keywordMap)===null||r===void 0?void 0:r._ALPHATEST_ON)!==null&&s!==void 0?s:!1,Hn=It?"BLEND":bt?"MASK":"OPAQUE",kn=bt?(l=(a=e.floatProperties)===null||a===void 0?void 0:a._Cutoff)!==null&&l!==void 0?l:.5:void 0,Wn=((c=(u=e.floatProperties)===null||u===void 0?void 0:u._CullMode)!==null&&c!==void 0?c:2)===0,z=this._portTextureTransform(e),$n=((h=(f=e.vectorProperties)===null||f===void 0?void 0:f._Color)!==null&&h!==void 0?h:[1,1,1,1]).map((Ht,pi)=>pi===3?Ht:ee(Ht)),Nt=(m=e.textureProperties)===null||m===void 0?void 0:m._MainTex,zn=Nt!=null?{index:Nt,extensions:Object.assign({},z)}:void 0,jn=(g=(p=e.floatProperties)===null||p===void 0?void 0:p._BumpScale)!==null&&g!==void 0?g:1,Ut=(v=e.textureProperties)===null||v===void 0?void 0:v._BumpMap,qn=Ut!=null?{index:Ut,scale:jn,extensions:Object.assign({},z)}:void 0,Qn=((y=(M=e.vectorProperties)===null||M===void 0?void 0:M._EmissionColor)!==null&&y!==void 0?y:[0,0,0,1]).map(ee),Ct=(x=e.textureProperties)===null||x===void 0?void 0:x._EmissionMap,Xn=Ct!=null?{index:Ct,extensions:Object.assign({},z)}:void 0,Yn=((R=(T=e.vectorProperties)===null||T===void 0?void 0:T._ShadeColor)!==null&&R!==void 0?R:[.97,.81,.86,1]).map(ee),Ot=(w=e.textureProperties)===null||w===void 0?void 0:w._ShadeTexture,Gn=Ot!=null?{index:Ot,extensions:Object.assign({},z)}:void 0;let ve=(A=(I=e.floatProperties)===null||I===void 0?void 0:I._ShadeShift)!==null&&A!==void 0?A:0,ge=(b=(L=e.floatProperties)===null||L===void 0?void 0:L._ShadeToony)!==null&&b!==void 0?b:.9;ge=P.lerp(ge,1,.5+.5*ve),ve=-ve-(1-ge);const Vt=(J=(k=e.floatProperties)===null||k===void 0?void 0:k._IndirectLightIntensity)!==null&&J!==void 0?J:.1,Zn=Vt?1-Vt:void 0,lt=(Ce=e.textureProperties)===null||Ce===void 0?void 0:Ce._SphereAdd,Jn=lt!=null?[1,1,1]:void 0,Kn=lt!=null?{index:lt}:void 0,ei=(Ve=(Oe=e.floatProperties)===null||Oe===void 0?void 0:Oe._RimLightingMix)!==null&&Ve!==void 0?Ve:0,Dt=(De=e.textureProperties)===null||De===void 0?void 0:De._RimTexture,ti=Dt!=null?{index:Dt,extensions:Object.assign({},z)}:void 0,ni=((Be=(Fe=e.vectorProperties)===null||Fe===void 0?void 0:Fe._RimColor)!==null&&Be!==void 0?Be:[0,0,0,1]).map(ee),ii=(ke=(He=e.floatProperties)===null||He===void 0?void 0:He._RimFresnelPower)!==null&&ke!==void 0?ke:1,oi=($e=(We=e.floatProperties)===null||We===void 0?void 0:We._RimLift)!==null&&$e!==void 0?$e:0,ri=["none","worldCoordinates","screenCoordinates"][(je=(ze=e.floatProperties)===null||ze===void 0?void 0:ze._OutlineWidthMode)!==null&&je!==void 0?je:0];let ut=(Qe=(qe=e.floatProperties)===null||qe===void 0?void 0:qe._OutlineWidth)!==null&&Qe!==void 0?Qe:0;ut=.01*ut;const Ft=(Xe=e.textureProperties)===null||Xe===void 0?void 0:Xe._OutlineWidthTexture,si=Ft!=null?{index:Ft,extensions:Object.assign({},z)}:void 0,ai=((Ge=(Ye=e.vectorProperties)===null||Ye===void 0?void 0:Ye._OutlineColor)!==null&&Ge!==void 0?Ge:[0,0,0]).map(ee),li=((Je=(Ze=e.floatProperties)===null||Ze===void 0?void 0:Ze._OutlineColorMode)!==null&&Je!==void 0?Je:0)===1?(et=(Ke=e.floatProperties)===null||Ke===void 0?void 0:Ke._OutlineLightingMix)!==null&&et!==void 0?et:1:0,Bt=(tt=e.textureProperties)===null||tt===void 0?void 0:tt._UvAnimMaskTexture,ui=Bt!=null?{index:Bt,extensions:Object.assign({},z)}:void 0,di=(it=(nt=e.floatProperties)===null||nt===void 0?void 0:nt._UvAnimScrollX)!==null&&it!==void 0?it:0;let Me=(rt=(ot=e.floatProperties)===null||ot===void 0?void 0:ot._UvAnimScrollY)!==null&&rt!==void 0?rt:0;Me!=null&&(Me=-Me);const ci=(at=(st=e.floatProperties)===null||st===void 0?void 0:st._UvAnimRotation)!==null&&at!==void 0?at:0,hi={specVersion:"1.0",transparentWithZWrite:Fn,renderQueueOffsetNumber:Bn,shadeColorFactor:Yn,shadeMultiplyTexture:Gn,shadingShiftFactor:ve,shadingToonyFactor:ge,giEqualizationFactor:Zn,matcapFactor:Jn,matcapTexture:Kn,rimLightingMixFactor:ei,rimMultiplyTexture:ti,parametricRimColorFactor:ni,parametricRimFresnelPowerFactor:ii,parametricRimLiftFactor:oi,outlineWidthMode:ri,outlineWidthFactor:ut,outlineWidthMultiplyTexture:si,outlineColorFactor:ai,outlineLightingMixFactor:li,uvAnimationMaskTexture:ui,uvAnimationScrollXSpeedFactor:di,uvAnimationScrollYSpeedFactor:Me,uvAnimationRotationSpeedFactor:ci};return Object.assign(Object.assign({},t),{pbrMetallicRoughness:{baseColorFactor:$n,baseColorTexture:zn},normalTexture:qn,emissiveTexture:Xn,emissiveFactor:Qn,alphaMode:Hn,alphaCutoff:kn,doubleSided:Wn,extensions:{VRMC_materials_mtoon:hi}})}_parseV0UnlitProperties(e,t){var n,i,o,r,s;const a=e.shader==="VRM/UnlitTransparentZWrite",l=e.shader==="VRM/UnlitTransparent"||a,u=this._v0ParseRenderQueue(e),c=e.shader==="VRM/UnlitCutout",f=l?"BLEND":c?"MASK":"OPAQUE",h=c?(i=(n=e.floatProperties)===null||n===void 0?void 0:n._Cutoff)!==null&&i!==void 0?i:.5:void 0,m=this._portTextureTransform(e),p=((r=(o=e.vectorProperties)===null||o===void 0?void 0:o._Color)!==null&&r!==void 0?r:[1,1,1,1]).map(ee),g=(s=e.textureProperties)===null||s===void 0?void 0:s._MainTex,v=g!=null?{index:g,extensions:Object.assign({},m)}:void 0,M={specVersion:"1.0",transparentWithZWrite:a,renderQueueOffsetNumber:u,shadeColorFactor:p,shadeMultiplyTexture:v};return Object.assign(Object.assign({},t),{pbrMetallicRoughness:{baseColorFactor:p,baseColorTexture:v},alphaMode:f,alphaCutoff:h,extensions:{VRMC_materials_mtoon:M}})}_portTextureTransform(e){var t,n,i,o,r;const s=(t=e.vectorProperties)===null||t===void 0?void 0:t._MainTex;if(s==null)return{};const a=[(n=s==null?void 0:s[0])!==null&&n!==void 0?n:0,(i=s==null?void 0:s[1])!==null&&i!==void 0?i:0],l=[(o=s==null?void 0:s[2])!==null&&o!==void 0?o:1,(r=s==null?void 0:s[3])!==null&&r!==void 0?r:1];return a[1]=1-l[1]-a[1],{KHR_texture_transform:{offset:a,scale:l}}}_v0ParseRenderQueue(e){var t,n,i;const o=(n=(t=e.keywordMap)===null||t===void 0?void 0:t._ALPHABLEND_ON)!==null&&n!==void 0?n:!1,r=((i=e.floatProperties)===null||i===void 0?void 0:i._ZWrite)===1;let s=0;if(o){const a=e.renderQueue;a!=null&&(r?s=this._renderQueueMapTransparentZWrite.get(a):s=this._renderQueueMapTransparent.get(a))}return s}_populateRenderQueueMap(e){const t=new Set,n=new Set;e.forEach(i=>{var o,r,s;const a=(r=(o=i.keywordMap)===null||o===void 0?void 0:o._ALPHABLEND_ON)!==null&&r!==void 0?r:!1,l=((s=i.floatProperties)===null||s===void 0?void 0:s._ZWrite)===1;if(a){const u=i.renderQueue;u!=null&&(l?n.add(u):t.add(u))}}),t.size>10&&console.warn(`VRMMaterialsV0CompatPlugin: This VRM uses ${t.size} render queues for Transparent materials while VRM 1.0 only supports up to 10 render queues. The model might not be rendered correctly.`),n.size>10&&console.warn(`VRMMaterialsV0CompatPlugin: This VRM uses ${n.size} render queues for TransparentZWrite materials while VRM 1.0 only supports up to 10 render queues. The model might not be rendered correctly.`),Array.from(t).sort().forEach((i,o)=>{const r=Math.min(Math.max(o-t.size+1,-9),0);this._renderQueueMapTransparent.set(i,r)}),Array.from(n).sort().forEach((i,o)=>{const r=Math.min(Math.max(o,0),9);this._renderQueueMapTransparentZWrite.set(i,r)})}}/*!
 * @pixiv/three-vrm-node-constraint v2.1.3
 * Node constraint module for @pixiv/three-vrm
 *
 * Copyright (c) 2020-2024 pixiv Inc.
 * @pixiv/three-vrm-node-constraint is distributed under MIT License
 * https://github.com/pixiv/three-vrm/blob/release/LICENSE
 */const W=new _;class vt extends se{constructor(e){super(),this._attrPosition=new N(new Float32Array([0,0,0,0,0,0]),3),this._attrPosition.setUsage(Mi);const t=new Z;t.setAttribute("position",this._attrPosition);const n=new Ie({color:16711935,depthTest:!1,depthWrite:!1});this._line=new xi(t,n),this.add(this._line),this.constraint=e}updateMatrixWorld(e){W.setFromMatrixPosition(this.constraint.destination.matrixWorld),this._attrPosition.setXYZ(0,W.x,W.y,W.z),this.constraint.source&&W.setFromMatrixPosition(this.constraint.source.matrixWorld),this._attrPosition.setXYZ(1,W.x,W.y,W.z),this._attrPosition.needsUpdate=!0,super.updateMatrixWorld(e)}}function dn(d,e){return e.set(d.elements[12],d.elements[13],d.elements[14])}const mo=new _,_o=new _;function vo(d,e){return d.decompose(mo,e,_o),e}function Le(d){return d.invert?d.invert():d.inverse(),d}class Lt{constructor(e,t){this.destination=e,this.source=t,this.weight=1}}const go=new _,Mo=new _,xo=new _,yo=new E,To=new E,wo=new E;class Ro extends Lt{get aimAxis(){return this._aimAxis}set aimAxis(e){this._aimAxis=e,this._v3AimAxis.set(e==="PositiveX"?1:e==="NegativeX"?-1:0,e==="PositiveY"?1:e==="NegativeY"?-1:0,e==="PositiveZ"?1:e==="NegativeZ"?-1:0)}get dependencies(){const e=new Set([this.source]);return this.destination.parent&&e.add(this.destination.parent),e}constructor(e,t){super(e,t),this._aimAxis="PositiveX",this._v3AimAxis=new _(1,0,0),this._dstRestQuat=new E}setInitState(){this._dstRestQuat.copy(this.destination.quaternion)}update(){this.destination.updateWorldMatrix(!0,!1),this.source.updateWorldMatrix(!0,!1);const e=yo.identity(),t=To.identity();this.destination.parent&&(vo(this.destination.parent.matrixWorld,e),Le(t.copy(e)));const n=go.copy(this._v3AimAxis).applyQuaternion(this._dstRestQuat).applyQuaternion(e),i=dn(this.source.matrixWorld,Mo).sub(dn(this.destination.matrixWorld,xo)).normalize(),o=wo.setFromUnitVectors(n,i).premultiply(t).multiply(e).multiply(this._dstRestQuat);this.destination.quaternion.copy(this._dstRestQuat).slerp(o,this.weight)}}function cn(d,e,t,n){function i(o){return o instanceof t?o:new t(function(r){r(o)})}return new(t||(t=Promise))(function(o,r){function s(u){try{l(n.next(u))}catch(c){r(c)}}function a(u){try{l(n.throw(u))}catch(c){r(c)}}function l(u){u.done?o(u.value):i(u.value).then(s,a)}l((n=n.apply(d,[])).next())})}function Eo(d,e){const t=[d];let n=d.parent;for(;n!==null;)t.unshift(n),n=n.parent;t.forEach(i=>{e(i)})}class So{constructor(){this._constraints=new Set,this._objectConstraintsMap=new Map}get constraints(){return this._constraints}addConstraint(e){this._constraints.add(e);let t=this._objectConstraintsMap.get(e.destination);t==null&&(t=new Set,this._objectConstraintsMap.set(e.destination,t)),t.add(e)}deleteConstraint(e){this._constraints.delete(e),this._objectConstraintsMap.get(e.destination).delete(e)}setInitState(){const e=new Set,t=new Set;for(const n of this._constraints)this._processConstraint(n,e,t,i=>i.setInitState())}update(){const e=new Set,t=new Set;for(const n of this._constraints)this._processConstraint(n,e,t,i=>i.update())}_processConstraint(e,t,n,i){if(n.has(e))return;if(t.has(e))throw new Error("VRMNodeConstraintManager: Circular dependency detected while updating constraints");t.add(e);const o=e.dependencies;for(const r of o)Eo(r,s=>{const a=this._objectConstraintsMap.get(s);if(a)for(const l of a)this._processConstraint(l,t,n,i)});i(e),n.add(e)}}const Ao=new E,Po=new E;class Lo extends Lt{get dependencies(){return new Set([this.source])}constructor(e,t){super(e,t),this._dstRestQuat=new E,this._invSrcRestQuat=new E}setInitState(){this._dstRestQuat.copy(this.destination.quaternion),Le(this._invSrcRestQuat.copy(this.source.quaternion))}update(){const e=Ao.copy(this._invSrcRestQuat).multiply(this.source.quaternion),t=Po.copy(this._dstRestQuat).multiply(e);this.destination.quaternion.copy(this._dstRestQuat).slerp(t,this.weight)}}const Io=new _,bo=new E,No=new E;class Uo extends Lt{get rollAxis(){return this._rollAxis}set rollAxis(e){this._rollAxis=e,this._v3RollAxis.set(e==="X"?1:0,e==="Y"?1:0,e==="Z"?1:0)}get dependencies(){return new Set([this.source])}constructor(e,t){super(e,t),this._rollAxis="X",this._v3RollAxis=new _(1,0,0),this._dstRestQuat=new E,this._invDstRestQuat=new E,this._invSrcRestQuatMulDstRestQuat=new E}setInitState(){this._dstRestQuat.copy(this.destination.quaternion),Le(this._invDstRestQuat.copy(this._dstRestQuat)),Le(this._invSrcRestQuatMulDstRestQuat.copy(this.source.quaternion)).multiply(this._dstRestQuat)}update(){const e=bo.copy(this._invDstRestQuat).multiply(this.source.quaternion).multiply(this._invSrcRestQuatMulDstRestQuat),t=Io.copy(this._v3RollAxis).applyQuaternion(e),i=No.setFromUnitVectors(t,this._v3RollAxis).premultiply(this._dstRestQuat).multiply(e);this.destination.quaternion.copy(this._dstRestQuat).slerp(i,this.weight)}}const Co=new Set(["1.0","1.0-beta"]);class Y{get name(){return Y.EXTENSION_NAME}constructor(e,t){this.parser=e,this.helperRoot=t==null?void 0:t.helperRoot}afterRoot(e){return cn(this,void 0,void 0,function*(){e.userData.vrmNodeConstraintManager=yield this._import(e)})}_import(e){var t;return cn(this,void 0,void 0,function*(){const n=this.parser.json;if(!(((t=n.extensionsUsed)===null||t===void 0?void 0:t.indexOf(Y.EXTENSION_NAME))!==-1))return null;const o=new So,r=yield this.parser.getDependencies("node");return r.forEach((s,a)=>{var l;const u=n.nodes[a],c=(l=u==null?void 0:u.extensions)===null||l===void 0?void 0:l[Y.EXTENSION_NAME];if(c==null)return;const f=c.specVersion;if(!Co.has(f)){console.warn(`VRMNodeConstraintLoaderPlugin: Unknown ${Y.EXTENSION_NAME} specVersion "${f}"`);return}const h=c.constraint;if(h.roll!=null){const m=this._importRollConstraint(s,r,h.roll);o.addConstraint(m)}else if(h.aim!=null){const m=this._importAimConstraint(s,r,h.aim);o.addConstraint(m)}else if(h.rotation!=null){const m=this._importRotationConstraint(s,r,h.rotation);o.addConstraint(m)}}),e.scene.updateMatrixWorld(),o.setInitState(),o})}_importRollConstraint(e,t,n){const{source:i,rollAxis:o,weight:r}=n,s=t[i],a=new Uo(e,s);if(o!=null&&(a.rollAxis=o),r!=null&&(a.weight=r),this.helperRoot){const l=new vt(a);this.helperRoot.add(l)}return a}_importAimConstraint(e,t,n){const{source:i,aimAxis:o,weight:r}=n,s=t[i],a=new Ro(e,s);if(o!=null&&(a.aimAxis=o),r!=null&&(a.weight=r),this.helperRoot){const l=new vt(a);this.helperRoot.add(l)}return a}_importRotationConstraint(e,t,n){const{source:i,weight:o}=n,r=t[i],s=new Lo(e,r);if(o!=null&&(s.weight=o),this.helperRoot){const a=new vt(s);this.helperRoot.add(a)}return s}}Y.EXTENSION_NAME="VRMC_node_constraint";/*!
 * @pixiv/three-vrm-springbone v2.1.3
 * Spring bone module for @pixiv/three-vrm
 *
 * Copyright (c) 2020-2024 pixiv Inc.
 * @pixiv/three-vrm-springbone is distributed under MIT License
 * https://github.com/pixiv/three-vrm/blob/release/LICENSE
 */class Un{}const gt=new _,Q=new _;class Cn extends Un{get type(){return"capsule"}constructor(e){var t,n,i;super(),this.offset=(t=e==null?void 0:e.offset)!==null&&t!==void 0?t:new _(0,0,0),this.tail=(n=e==null?void 0:e.tail)!==null&&n!==void 0?n:new _(0,0,0),this.radius=(i=e==null?void 0:e.radius)!==null&&i!==void 0?i:0}calculateCollision(e,t,n,i){gt.copy(this.offset).applyMatrix4(e),Q.copy(this.tail).applyMatrix4(e),Q.sub(gt);const o=Q.lengthSq();i.copy(t).sub(gt);const r=Q.dot(i);r<=0||(o<=r||Q.multiplyScalar(r/o),i.sub(Q));const s=n+this.radius,a=i.length()-s;return i.normalize(),a}}class On extends Un{get type(){return"sphere"}constructor(e){var t,n;super(),this.offset=(t=e==null?void 0:e.offset)!==null&&t!==void 0?t:new _(0,0,0),this.radius=(n=e==null?void 0:e.radius)!==null&&n!==void 0?n:0}calculateCollision(e,t,n,i){i.copy(this.offset).applyMatrix4(e),i.negate().add(t);const o=n+this.radius,r=i.length()-o;return i.normalize(),r}}const V=new _;class Oo extends Z{constructor(e){super(),this.worldScale=1,this._currentRadius=0,this._currentOffset=new _,this._currentTail=new _,this._shape=e,this._attrPos=new N(new Float32Array(396),3),this.setAttribute("position",this._attrPos),this._attrIndex=new N(new Uint16Array(264),1),this.setIndex(this._attrIndex),this._buildIndex(),this.update()}update(){let e=!1;const t=this._shape.radius/this.worldScale;this._currentRadius!==t&&(this._currentRadius=t,e=!0),this._currentOffset.equals(this._shape.offset)||(this._currentOffset.copy(this._shape.offset),e=!0);const n=V.copy(this._shape.tail).divideScalar(this.worldScale);this._currentTail.distanceToSquared(n)>1e-10&&(this._currentTail.copy(n),e=!0),e&&this._buildPosition()}_buildPosition(){V.copy(this._currentTail).sub(this._currentOffset);const e=V.length()/this._currentRadius;for(let i=0;i<=16;i++){const o=i/16*Math.PI;this._attrPos.setXYZ(i,-Math.sin(o),-Math.cos(o),0),this._attrPos.setXYZ(17+i,e+Math.sin(o),Math.cos(o),0),this._attrPos.setXYZ(34+i,-Math.sin(o),0,-Math.cos(o)),this._attrPos.setXYZ(51+i,e+Math.sin(o),0,Math.cos(o))}for(let i=0;i<32;i++){const o=i/16*Math.PI;this._attrPos.setXYZ(68+i,0,Math.sin(o),Math.cos(o)),this._attrPos.setXYZ(100+i,e,Math.sin(o),Math.cos(o))}const t=Math.atan2(V.y,Math.sqrt(V.x*V.x+V.z*V.z)),n=-Math.atan2(V.z,V.x);this.rotateZ(t),this.rotateY(n),this.scale(this._currentRadius,this._currentRadius,this._currentRadius),this.translate(this._currentOffset.x,this._currentOffset.y,this._currentOffset.z),this._attrPos.needsUpdate=!0}_buildIndex(){for(let e=0;e<34;e++){const t=(e+1)%34;this._attrIndex.setXY(e*2,e,t),this._attrIndex.setXY(68+e*2,34+e,34+t)}for(let e=0;e<32;e++){const t=(e+1)%32;this._attrIndex.setXY(136+e*2,68+e,68+t),this._attrIndex.setXY(200+e*2,100+e,100+t)}this._attrIndex.needsUpdate=!0}}class Vo extends Z{constructor(e){super(),this.worldScale=1,this._currentRadius=0,this._currentOffset=new _,this._shape=e,this._attrPos=new N(new Float32Array(32*3*3),3),this.setAttribute("position",this._attrPos),this._attrIndex=new N(new Uint16Array(64*3),1),this.setIndex(this._attrIndex),this._buildIndex(),this.update()}update(){let e=!1;const t=this._shape.radius/this.worldScale;this._currentRadius!==t&&(this._currentRadius=t,e=!0),this._currentOffset.equals(this._shape.offset)||(this._currentOffset.copy(this._shape.offset),e=!0),e&&this._buildPosition()}_buildPosition(){for(let e=0;e<32;e++){const t=e/16*Math.PI;this._attrPos.setXYZ(e,Math.cos(t),Math.sin(t),0),this._attrPos.setXYZ(32+e,0,Math.cos(t),Math.sin(t)),this._attrPos.setXYZ(64+e,Math.sin(t),0,Math.cos(t))}this.scale(this._currentRadius,this._currentRadius,this._currentRadius),this.translate(this._currentOffset.x,this._currentOffset.y,this._currentOffset.z),this._attrPos.needsUpdate=!0}_buildIndex(){for(let e=0;e<32;e++){const t=(e+1)%32;this._attrIndex.setXY(e*2,e,t),this._attrIndex.setXY(64+e*2,32+e,32+t),this._attrIndex.setXY(128+e*2,64+e,64+t)}this._attrIndex.needsUpdate=!0}}const Do=new _;class hn extends se{constructor(e){if(super(),this.matrixAutoUpdate=!1,this.collider=e,this.collider.shape instanceof On)this._geometry=new Vo(this.collider.shape);else if(this.collider.shape instanceof Cn)this._geometry=new Oo(this.collider.shape);else throw new Error("VRMSpringBoneColliderHelper: Unknown collider shape type detected");const t=new Ie({color:16711935,depthTest:!1,depthWrite:!1});this._line=new Pt(this._geometry,t),this.add(this._line)}dispose(){this._geometry.dispose()}updateMatrixWorld(e){this.collider.updateWorldMatrix(!0,!1),this.matrix.copy(this.collider.matrixWorld);const t=this.matrix.elements;this._geometry.worldScale=Do.set(t[0],t[1],t[2]).length(),this._geometry.update(),super.updateMatrixWorld(e)}}class Fo extends Z{constructor(e){super(),this.worldScale=1,this._currentRadius=0,this._currentTail=new _,this._springBone=e,this._attrPos=new N(new Float32Array(294),3),this.setAttribute("position",this._attrPos),this._attrIndex=new N(new Uint16Array(194),1),this.setIndex(this._attrIndex),this._buildIndex(),this.update()}update(){let e=!1;const t=this._springBone.settings.hitRadius/this.worldScale;this._currentRadius!==t&&(this._currentRadius=t,e=!0),this._currentTail.equals(this._springBone.initialLocalChildPosition)||(this._currentTail.copy(this._springBone.initialLocalChildPosition),e=!0),e&&this._buildPosition()}_buildPosition(){for(let e=0;e<32;e++){const t=e/16*Math.PI;this._attrPos.setXYZ(e,Math.cos(t),Math.sin(t),0),this._attrPos.setXYZ(32+e,0,Math.cos(t),Math.sin(t)),this._attrPos.setXYZ(64+e,Math.sin(t),0,Math.cos(t))}this.scale(this._currentRadius,this._currentRadius,this._currentRadius),this.translate(this._currentTail.x,this._currentTail.y,this._currentTail.z),this._attrPos.setXYZ(96,0,0,0),this._attrPos.setXYZ(97,this._currentTail.x,this._currentTail.y,this._currentTail.z),this._attrPos.needsUpdate=!0}_buildIndex(){for(let e=0;e<32;e++){const t=(e+1)%32;this._attrIndex.setXY(e*2,e,t),this._attrIndex.setXY(64+e*2,32+e,32+t),this._attrIndex.setXY(128+e*2,64+e,64+t)}this._attrIndex.setXY(192,96,97),this._attrIndex.needsUpdate=!0}}const Bo=new _;class Ho extends se{constructor(e){super(),this.matrixAutoUpdate=!1,this.springBone=e,this._geometry=new Fo(this.springBone);const t=new Ie({color:16776960,depthTest:!1,depthWrite:!1});this._line=new Pt(this._geometry,t),this.add(this._line)}dispose(){this._geometry.dispose()}updateMatrixWorld(e){this.springBone.bone.updateWorldMatrix(!0,!1),this.matrix.copy(this.springBone.bone.matrixWorld);const t=this.matrix.elements;this._geometry.worldScale=Bo.set(t[0],t[1],t[2]).length(),this._geometry.update(),super.updateMatrixWorld(e)}}class pn extends pe{constructor(e){super(),this.shape=e}}const ko=new H;function Vn(d){return d.invert?d.invert():d.getInverse(ko.copy(d)),d}class Wo{get inverse(){return this._shouldUpdateInverse&&(this._inverseCache.copy(this.matrix),Vn(this._inverseCache),this._shouldUpdateInverse=!1),this._inverseCache}constructor(e){this._inverseCache=new H,this._shouldUpdateInverse=!0,this.matrix=e;const t={set:(n,i,o)=>(this._shouldUpdateInverse=!0,n[i]=o,!0)};this._originalElements=e.elements,e.elements=new Proxy(e.elements,t)}revert(){this.matrix.elements=this._originalElements}}const $o=new H,B=new _,de=new _,zo=new _,te=new _,fn=new _,ce=new _,mn=new E,ne=new H,jo=new H;class qo{get center(){return this._center}set center(e){var t;!((t=this._center)===null||t===void 0)&&t.userData.inverseCacheProxy&&(this._center.userData.inverseCacheProxy.revert(),delete this._center.userData.inverseCacheProxy),this._center=e,this._center&&(this._center.userData.inverseCacheProxy||(this._center.userData.inverseCacheProxy=new Wo(this._center.matrixWorld)))}get initialLocalChildPosition(){return this._initialLocalChildPosition}get _parentMatrixWorld(){return this.bone.parent?this.bone.parent.matrixWorld:$o}constructor(e,t,n={},i=[]){var o,r,s,a,l,u;this._currentTail=new _,this._prevTail=new _,this._boneAxis=new _,this._worldSpaceBoneLength=0,this._center=null,this._initialLocalMatrix=new H,this._initialLocalRotation=new E,this._initialLocalChildPosition=new _,this.bone=e,this.bone.matrixAutoUpdate=!1,this.child=t,this.settings={hitRadius:(o=n.hitRadius)!==null&&o!==void 0?o:0,stiffness:(r=n.stiffness)!==null&&r!==void 0?r:1,gravityPower:(s=n.gravityPower)!==null&&s!==void 0?s:0,gravityDir:(l=(a=n.gravityDir)===null||a===void 0?void 0:a.clone())!==null&&l!==void 0?l:new _(0,-1,0),dragForce:(u=n.dragForce)!==null&&u!==void 0?u:.4},this.colliderGroups=i}setInitState(){this._initialLocalMatrix.copy(this.bone.matrix),this._initialLocalRotation.copy(this.bone.quaternion),this.child?this._initialLocalChildPosition.copy(this.child.position):this._initialLocalChildPosition.copy(this.bone.position).normalize().multiplyScalar(.07);const e=this._getMatrixWorldToCenter(ne);this.bone.localToWorld(this._currentTail.copy(this._initialLocalChildPosition)).applyMatrix4(e),this._prevTail.copy(this._currentTail),this._boneAxis.copy(this._initialLocalChildPosition).normalize()}reset(){this.bone.quaternion.copy(this._initialLocalRotation),this.bone.updateMatrix(),this.bone.matrixWorld.multiplyMatrices(this._parentMatrixWorld,this.bone.matrix);const e=this._getMatrixWorldToCenter(ne);this.bone.localToWorld(this._currentTail.copy(this._initialLocalChildPosition)).applyMatrix4(e),this._prevTail.copy(this._currentTail)}update(e){if(e<=0)return;this._calcWorldSpaceBoneLength(),te.setFromMatrixPosition(this.bone.matrixWorld);let t=this._getMatrixWorldToCenter(ne);fn.copy(te).applyMatrix4(t);const n=mn.setFromRotationMatrix(t),i=jo.copy(t).multiply(this._parentMatrixWorld),o=de.copy(this._boneAxis).applyMatrix4(this._initialLocalMatrix).applyMatrix4(i).sub(fn).normalize(),r=zo.copy(this.settings.gravityDir).applyQuaternion(n).normalize(),s=this._getMatrixCenterToWorld(ne);ce.copy(this._currentTail).add(B.copy(this._currentTail).sub(this._prevTail).multiplyScalar(1-this.settings.dragForce)).add(B.copy(o).multiplyScalar(this.settings.stiffness*e)).add(B.copy(r).multiplyScalar(this.settings.gravityPower*e)).applyMatrix4(s),ce.sub(te).normalize().multiplyScalar(this._worldSpaceBoneLength).add(te),this._collision(ce),t=this._getMatrixWorldToCenter(ne),this._prevTail.copy(this._currentTail),this._currentTail.copy(B.copy(ce).applyMatrix4(t));const a=Vn(ne.copy(this._parentMatrixWorld).multiply(this._initialLocalMatrix)),l=mn.setFromUnitVectors(this._boneAxis,B.copy(ce).applyMatrix4(a).normalize());this.bone.quaternion.copy(this._initialLocalRotation).multiply(l),this.bone.updateMatrix(),this.bone.matrixWorld.multiplyMatrices(this._parentMatrixWorld,this.bone.matrix)}_collision(e){this.colliderGroups.forEach(t=>{t.colliders.forEach(n=>{const i=n.shape.calculateCollision(n.matrixWorld,e,this.settings.hitRadius,B);i<0&&(e.add(B.multiplyScalar(-i)),e.sub(te).normalize().multiplyScalar(this._worldSpaceBoneLength).add(te))})})}_calcWorldSpaceBoneLength(){B.setFromMatrixPosition(this.bone.matrixWorld),this.child?de.setFromMatrixPosition(this.child.matrixWorld):(de.copy(this._initialLocalChildPosition),de.applyMatrix4(this.bone.matrixWorld)),this._worldSpaceBoneLength=B.sub(de).length()}_getMatrixCenterToWorld(e){return this._center?e.copy(this._center.matrixWorld):e.identity(),e}_getMatrixWorldToCenter(e){return this._center?e.copy(this._center.userData.inverseCacheProxy.inverse):e.identity(),e}}function we(d,e,t,n){function i(o){return o instanceof t?o:new t(function(r){r(o)})}return new(t||(t=Promise))(function(o,r){function s(u){try{l(n.next(u))}catch(c){r(c)}}function a(u){try{l(n.throw(u))}catch(c){r(c)}}function l(u){u.done?o(u.value):i(u.value).then(s,a)}l((n=n.apply(d,[])).next())})}function Qo(d,e){const t=[];let n=d;for(;n!==null;)t.unshift(n),n=n.parent;t.forEach(i=>{e(i)})}function Dn(d,e){d.children.forEach(t=>{e(t)||Dn(t,e)})}class _n{constructor(){this._joints=new Set,this._objectSpringBonesMap=new Map}get joints(){return this._joints}get springBones(){return console.warn("VRMSpringBoneManager: springBones is deprecated. use joints instead."),this._joints}get colliderGroups(){const e=new Set;return this._joints.forEach(t=>{t.colliderGroups.forEach(n=>{e.add(n)})}),Array.from(e)}get colliders(){const e=new Set;return this.colliderGroups.forEach(t=>{t.colliders.forEach(n=>{e.add(n)})}),Array.from(e)}addJoint(e){this._joints.add(e);let t=this._objectSpringBonesMap.get(e.bone);t==null&&(t=new Set,this._objectSpringBonesMap.set(e.bone,t)),t.add(e)}addSpringBone(e){console.warn("VRMSpringBoneManager: addSpringBone() is deprecated. use addJoint() instead."),this.addJoint(e)}deleteJoint(e){this._joints.delete(e),this._objectSpringBonesMap.get(e.bone).delete(e)}deleteSpringBone(e){console.warn("VRMSpringBoneManager: deleteSpringBone() is deprecated. use deleteJoint() instead."),this.deleteJoint(e)}setInitState(){const e=new Set,t=new Set,n=new Set;for(const i of this._joints)this._processSpringBone(i,e,t,n,o=>o.setInitState())}reset(){const e=new Set,t=new Set,n=new Set;for(const i of this._joints)this._processSpringBone(i,e,t,n,o=>o.reset())}update(e){const t=new Set,n=new Set,i=new Set;for(const o of this._joints)this._processSpringBone(o,t,n,i,r=>r.update(e)),Dn(o.bone,r=>{var s,a;return((a=(s=this._objectSpringBonesMap.get(r))===null||s===void 0?void 0:s.size)!==null&&a!==void 0?a:0)>0?!0:(r.updateWorldMatrix(!1,!1),!1)})}_processSpringBone(e,t,n,i,o){if(n.has(e))return;if(t.has(e))throw new Error("VRMSpringBoneManager: Circular dependency detected while updating springbones");t.add(e);const r=this._getDependencies(e);for(const s of r)Qo(s,a=>{const l=this._objectSpringBonesMap.get(a);if(l)for(const u of l)this._processSpringBone(u,t,n,i,o);else i.has(a)||(a.updateWorldMatrix(!1,!1),i.add(a))});e.bone.updateMatrix(),e.bone.updateWorldMatrix(!1,!1),o(e),i.add(e.bone),n.add(e)}_getDependencies(e){const t=new Set,n=e.bone.parent;return n&&t.add(n),e.colliderGroups.forEach(i=>{i.colliders.forEach(o=>{t.add(o)})}),t}}const Xo=new Set(["1.0","1.0-beta"]);class G{get name(){return G.EXTENSION_NAME}constructor(e,t){this.parser=e,this.jointHelperRoot=t==null?void 0:t.jointHelperRoot,this.colliderHelperRoot=t==null?void 0:t.colliderHelperRoot}afterRoot(e){return we(this,void 0,void 0,function*(){e.userData.vrmSpringBoneManager=yield this._import(e)})}_import(e){return we(this,void 0,void 0,function*(){const t=yield this._v1Import(e);if(t!=null)return t;const n=yield this._v0Import(e);return n??null})}_v1Import(e){var t,n,i,o,r;return we(this,void 0,void 0,function*(){const s=e.parser.json;if(!(((t=s.extensionsUsed)===null||t===void 0?void 0:t.indexOf(G.EXTENSION_NAME))!==-1))return null;const l=new _n,u=yield e.parser.getDependencies("node"),c=(n=s.extensions)===null||n===void 0?void 0:n[G.EXTENSION_NAME];if(!c)return null;const f=c.specVersion;if(!Xo.has(f))return console.warn(`VRMSpringBoneLoaderPlugin: Unknown ${G.EXTENSION_NAME} specVersion "${f}"`),null;const h=(i=c.colliders)===null||i===void 0?void 0:i.map((p,g)=>{var v,M,y,x,T;const R=u[p.node],w=p.shape;if(w.sphere)return this._importSphereCollider(R,{offset:new _().fromArray((v=w.sphere.offset)!==null&&v!==void 0?v:[0,0,0]),radius:(M=w.sphere.radius)!==null&&M!==void 0?M:0});if(w.capsule)return this._importCapsuleCollider(R,{offset:new _().fromArray((y=w.capsule.offset)!==null&&y!==void 0?y:[0,0,0]),radius:(x=w.capsule.radius)!==null&&x!==void 0?x:0,tail:new _().fromArray((T=w.capsule.tail)!==null&&T!==void 0?T:[0,0,0])});throw new Error(`VRMSpringBoneLoaderPlugin: The collider #${g} has no valid shape`)}),m=(o=c.colliderGroups)===null||o===void 0?void 0:o.map((p,g)=>{var v;return{colliders:((v=p.colliders)!==null&&v!==void 0?v:[]).map(y=>{const x=h==null?void 0:h[y];if(x==null)throw new Error(`VRMSpringBoneLoaderPlugin: The colliderGroup #${g} attempted to use a collider #${y} but not found`);return x}),name:p.name}});return(r=c.springs)===null||r===void 0||r.forEach((p,g)=>{var v;const M=p.joints,y=(v=p.colliderGroups)===null||v===void 0?void 0:v.map(R=>{const w=m==null?void 0:m[R];if(w==null)throw new Error(`VRMSpringBoneLoaderPlugin: The spring #${g} attempted to use a colliderGroup ${R} but not found`);return w}),x=p.center!=null?u[p.center]:void 0;let T;M.forEach(R=>{if(T){const w=T.node,I=u[w],A=R.node,L=u[A],b={hitRadius:T.hitRadius,dragForce:T.dragForce,gravityPower:T.gravityPower,stiffness:T.stiffness,gravityDir:T.gravityDir!=null?new _().fromArray(T.gravityDir):void 0},k=this._importJoint(I,L,b,y);x&&(k.center=x),l.addJoint(k)}T=R})}),l.setInitState(),l})}_v0Import(e){var t,n,i;return we(this,void 0,void 0,function*(){const o=e.parser.json;if(!(((t=o.extensionsUsed)===null||t===void 0?void 0:t.indexOf("VRM"))!==-1))return null;const s=(n=o.extensions)===null||n===void 0?void 0:n.VRM,a=s==null?void 0:s.secondaryAnimation;if(!a)return null;const l=a==null?void 0:a.boneGroups;if(!l)return null;const u=new _n,c=yield e.parser.getDependencies("node"),f=(i=a.colliderGroups)===null||i===void 0?void 0:i.map(h=>{var m;const p=c[h.node];return{colliders:((m=h.colliders)!==null&&m!==void 0?m:[]).map((v,M)=>{var y,x,T;const R=new _(0,0,0);return v.offset&&R.set((y=v.offset.x)!==null&&y!==void 0?y:0,(x=v.offset.y)!==null&&x!==void 0?x:0,v.offset.z?-v.offset.z:0),this._importSphereCollider(p,{offset:R,radius:(T=v.radius)!==null&&T!==void 0?T:0})})}});return l==null||l.forEach((h,m)=>{const p=h.bones;p&&p.forEach(g=>{var v,M,y,x;const T=c[g],R=new _;h.gravityDir?R.set((v=h.gravityDir.x)!==null&&v!==void 0?v:0,(M=h.gravityDir.y)!==null&&M!==void 0?M:0,(y=h.gravityDir.z)!==null&&y!==void 0?y:0):R.set(0,-1,0);const w=h.center!=null?c[h.center]:void 0,I={hitRadius:h.hitRadius,dragForce:h.dragForce,gravityPower:h.gravityPower,stiffness:h.stiffiness,gravityDir:R},A=(x=h.colliderGroups)===null||x===void 0?void 0:x.map(L=>{const b=f==null?void 0:f[L];if(b==null)throw new Error(`VRMSpringBoneLoaderPlugin: The spring #${m} attempted to use a colliderGroup ${L} but not found`);return b});T.traverse(L=>{var b;const k=(b=L.children[0])!==null&&b!==void 0?b:null,J=this._importJoint(L,k,I,A);w&&(J.center=w),u.addJoint(J)})})}),e.scene.updateMatrixWorld(),u.setInitState(),u})}_importJoint(e,t,n,i){const o=new qo(e,t,n,i);if(this.jointHelperRoot){const r=new Ho(o);this.jointHelperRoot.add(r),r.renderOrder=this.jointHelperRoot.renderOrder}return o}_importSphereCollider(e,t){const{offset:n,radius:i}=t,o=new On({offset:n,radius:i}),r=new pn(o);if(e.add(r),this.colliderHelperRoot){const s=new hn(r);this.colliderHelperRoot.add(s),s.renderOrder=this.colliderHelperRoot.renderOrder}return r}_importCapsuleCollider(e,t){const{offset:n,radius:i,tail:o}=t,r=new Cn({offset:n,radius:i,tail:o}),s=new pn(r);if(e.add(s),this.colliderHelperRoot){const a=new hn(s);this.colliderHelperRoot.add(a),a.renderOrder=this.colliderHelperRoot.renderOrder}return s}}G.EXTENSION_NAME="VRMC_springBone";class Tr{get name(){return"VRMLoaderPlugin"}constructor(e,t){var n,i,o,r,s,a,l,u,c,f;this.parser=e;const h=t==null?void 0:t.helperRoot,m=t==null?void 0:t.autoUpdateHumanBones;this.expressionPlugin=(n=t==null?void 0:t.expressionPlugin)!==null&&n!==void 0?n:new be(e),this.firstPersonPlugin=(i=t==null?void 0:t.firstPersonPlugin)!==null&&i!==void 0?i:new Ii(e),this.humanoidPlugin=(o=t==null?void 0:t.humanoidPlugin)!==null&&o!==void 0?o:new Di(e,{helperRoot:h,autoUpdateHumanBones:m}),this.lookAtPlugin=(r=t==null?void 0:t.lookAtPlugin)!==null&&r!==void 0?r:new Zi(e,{helperRoot:h}),this.metaPlugin=(s=t==null?void 0:t.metaPlugin)!==null&&s!==void 0?s:new eo(e),this.mtoonMaterialPlugin=(a=t==null?void 0:t.mtoonMaterialPlugin)!==null&&a!==void 0?a:new oe(e),this.materialsHDREmissiveMultiplierPlugin=(l=t==null?void 0:t.materialsHDREmissiveMultiplierPlugin)!==null&&l!==void 0?l:new _e(e),this.materialsV0CompatPlugin=(u=t==null?void 0:t.materialsV0CompatPlugin)!==null&&u!==void 0?u:new fo(e),this.springBonePlugin=(c=t==null?void 0:t.springBonePlugin)!==null&&c!==void 0?c:new G(e,{colliderHelperRoot:h,jointHelperRoot:h}),this.nodeConstraintPlugin=(f=t==null?void 0:t.nodeConstraintPlugin)!==null&&f!==void 0?f:new Y(e,{helperRoot:h})}beforeRoot(){return Te(this,void 0,void 0,function*(){yield this.materialsV0CompatPlugin.beforeRoot(),yield this.mtoonMaterialPlugin.beforeRoot()})}loadMesh(e){return Te(this,void 0,void 0,function*(){return yield this.mtoonMaterialPlugin.loadMesh(e)})}getMaterialType(e){const t=this.mtoonMaterialPlugin.getMaterialType(e);return t??null}extendMaterialParams(e,t){return Te(this,void 0,void 0,function*(){yield this.materialsHDREmissiveMultiplierPlugin.extendMaterialParams(e,t),yield this.mtoonMaterialPlugin.extendMaterialParams(e,t)})}afterRoot(e){return Te(this,void 0,void 0,function*(){yield this.metaPlugin.afterRoot(e),yield this.humanoidPlugin.afterRoot(e),yield this.expressionPlugin.afterRoot(e),yield this.lookAtPlugin.afterRoot(e),yield this.firstPersonPlugin.afterRoot(e),yield this.springBonePlugin.afterRoot(e),yield this.nodeConstraintPlugin.afterRoot(e),yield this.mtoonMaterialPlugin.afterRoot(e);const t=e.userData.vrmMeta,n=e.userData.vrmHumanoid;if(t&&n){const i=new no({scene:e.scene,expressionManager:e.userData.vrmExpressionManager,firstPerson:e.userData.vrmFirstPerson,humanoid:n,lookAt:e.userData.vrmLookAt,meta:t,materials:e.userData.vrmMToonMaterials,springBoneManager:e.userData.vrmSpringBoneManager,nodeConstraintManager:e.userData.vrmNodeConstraintManager});e.userData.vrm=i}})}}function vn(d){if(Object.values(d).forEach(e=>{e!=null&&e.isTexture&&e.dispose()}),d.isShaderMaterial){const e=d.uniforms;e&&Object.values(e).forEach(t=>{const n=t.value;n!=null&&n.isTexture&&n.dispose()})}d.dispose()}function Yo(d){const e=d.geometry;e&&e.dispose();const t=d.skeleton;t&&t.dispose();const n=d.material;n&&(Array.isArray(n)?n.forEach(i=>vn(i)):n&&vn(n))}function Go(d){d.traverse(Yo)}function Zo(d){const e=new Map;d.traverse(t=>{if(t.type!=="SkinnedMesh")return;const n=t,o=n.geometry.getAttribute("skinIndex");let r=e.get(o);if(!r){const s=[],a=[],l={},u=o.array;for(let c=0;c<u.length;c++){const f=u[c];l[f]===void 0&&(l[f]=s.length,s.push(n.skeleton.bones[f]),a.push(n.skeleton.boneInverses[f])),u[c]=l[f]}o.copyArray(u),o.needsUpdate=!0,r=new An(s,a),e.set(o,r)}n.bind(r,new H)})}function Jo(d){const e=new Map;d.traverse(t=>{var n,i,o,r;if(!t.isMesh)return;const s=t,a=s.geometry,l=a.index;if(l==null)return;const u=e.get(a);if(u!=null){s.geometry=u;return}const c=new Z;c.name=a.name,c.morphTargetsRelative=a.morphTargetsRelative,a.groups.forEach(p=>{c.addGroup(p.start,p.count,p.materialIndex)}),c.boundingBox=(i=(n=a.boundingBox)===null||n===void 0?void 0:n.clone())!==null&&i!==void 0?i:null,c.boundingSphere=(r=(o=a.boundingSphere)===null||o===void 0?void 0:o.clone())!==null&&r!==void 0?r:null,c.setDrawRange(a.drawRange.start,a.drawRange.count),c.userData=a.userData,e.set(a,c);const f=[],h=[];{const p=l.array,g=new p.constructor(p.length);let v=0;for(let M=0;M<p.length;M++){const y=p[M];let x=f[y];x==null&&(f[y]=v,h[v]=y,x=v,v++),g[M]=x}c.setIndex(new N(g,1,!1))}Object.keys(a.attributes).forEach(p=>{const g=a.attributes[p];if(g.isInterleavedBufferAttribute)throw new Error("removeUnnecessaryVertices: InterleavedBufferAttribute is not supported");const v=g.array,{itemSize:M,normalized:y}=g,x=new v.constructor(h.length*M);h.forEach((T,R)=>{for(let w=0;w<M;w++)x[R*M+w]=v[T*M+w]}),c.setAttribute(p,new N(x,M,y))});let m=!0;Object.keys(a.morphAttributes).forEach(p=>{c.morphAttributes[p]=[];const g=a.morphAttributes[p];for(let v=0;v<g.length;v++){const M=g[v];if(M.isInterleavedBufferAttribute)throw new Error("removeUnnecessaryVertices: InterleavedBufferAttribute is not supported");const y=M.array,{itemSize:x,normalized:T}=M,R=new y.constructor(h.length*x);h.forEach((w,I)=>{for(let A=0;A<x;A++)R[I*x+A]=y[w*x+A]}),m=m&&R.every(w=>w===0),c.morphAttributes[p][v]=new N(R,x,T)}}),m&&(c.morphAttributes={}),s.geometry=c}),Array.from(e.keys()).forEach(t=>{t.dispose()})}function Ko(d){var e;((e=d.meta)===null||e===void 0?void 0:e.metaVersion)==="0"&&(d.scene.rotation.y=Math.PI)}class Ne{constructor(){}}Ne.deepDispose=Go;Ne.removeUnnecessaryJoints=Zo;Ne.removeUnnecessaryVertices=Jo;Ne.rotateVRM0=Ko;/*!
 * @pixiv/three-vrm-animation v2.1.3
 * The implementation of VRM Animation
 *
 * Copyright (c) 2023-2024 pixiv Inc.
 * @pixiv/three-vrm-animation is distributed under MIT License
 * https://github.com/pixiv/three-vrm/blob/release/LICENSE
 *//*!
 * @pixiv/three-vrm-core v2.1.3
 * The implementation of core features of VRM, for @pixiv/three-vrm
 *
 * Copyright (c) 2020-2024 pixiv Inc.
 * @pixiv/three-vrm-core is distributed under MIT License
 * https://github.com/pixiv/three-vrm/blob/release/LICENSE
 */const er={Aa:"aa",Ih:"ih",Ou:"ou",Ee:"ee",Oh:"oh",Blink:"blink",Happy:"happy",Angry:"angry",Sad:"sad",Relaxed:"relaxed",LookUp:"lookUp",Surprised:"surprised",LookDown:"lookDown",LookLeft:"lookLeft",LookRight:"lookRight",BlinkLeft:"blinkLeft",BlinkRight:"blinkRight",Neutral:"neutral"};new C;new ie;new _;new _;const gn={hips:null,spine:"hips",chest:"spine",upperChest:"chest",neck:"upperChest",head:"neck",leftEye:"head",rightEye:"head",jaw:"head",leftUpperLeg:"hips",leftLowerLeg:"leftUpperLeg",leftFoot:"leftLowerLeg",leftToes:"leftFoot",rightUpperLeg:"hips",rightLowerLeg:"rightUpperLeg",rightFoot:"rightLowerLeg",rightToes:"rightFoot",leftShoulder:"upperChest",leftUpperArm:"leftShoulder",leftLowerArm:"leftUpperArm",leftHand:"leftLowerArm",rightShoulder:"upperChest",rightUpperArm:"rightShoulder",rightLowerArm:"rightUpperArm",rightHand:"rightLowerArm",leftThumbMetacarpal:"leftHand",leftThumbProximal:"leftThumbMetacarpal",leftThumbDistal:"leftThumbProximal",leftIndexProximal:"leftHand",leftIndexIntermediate:"leftIndexProximal",leftIndexDistal:"leftIndexIntermediate",leftMiddleProximal:"leftHand",leftMiddleIntermediate:"leftMiddleProximal",leftMiddleDistal:"leftMiddleIntermediate",leftRingProximal:"leftHand",leftRingIntermediate:"leftRingProximal",leftRingDistal:"leftRingIntermediate",leftLittleProximal:"leftHand",leftLittleIntermediate:"leftLittleProximal",leftLittleDistal:"leftLittleIntermediate",rightThumbMetacarpal:"rightHand",rightThumbProximal:"rightThumbMetacarpal",rightThumbDistal:"rightThumbProximal",rightIndexProximal:"rightHand",rightIndexIntermediate:"rightIndexProximal",rightIndexDistal:"rightIndexIntermediate",rightMiddleProximal:"rightHand",rightMiddleIntermediate:"rightMiddleProximal",rightMiddleDistal:"rightMiddleIntermediate",rightRingProximal:"rightHand",rightRingIntermediate:"rightRingProximal",rightRingDistal:"rightRingIntermediate",rightLittleProximal:"rightHand",rightLittleIntermediate:"rightLittleProximal",rightLittleDistal:"rightLittleIntermediate"};function tr(d){return d.invert?d.invert():d.inverse(),d}new _;new _;new _;new _;new _;new _(0,1,0);const nr=new _,ir=new _;function or(d,e){return d.matrixWorld.decompose(nr,e,ir),e}function Mt(d){return[Math.atan2(-d.z,d.x),Math.atan2(d.y,Math.sqrt(d.x*d.x+d.z*d.z))]}function Mn(d){const e=Math.round(d/2/Math.PI);return d-2*Math.PI*e}const xn=new _(0,0,1),rr=new _,sr=new _,ar=new _,lr=new E,xt=new E,yn=new E,ur=new E,yt=new re;class Ue{get yaw(){return this._yaw}set yaw(e){this._yaw=e,this._needsUpdate=!0}get pitch(){return this._pitch}set pitch(e){this._pitch=e,this._needsUpdate=!0}get euler(){return console.warn("VRMLookAt: euler is deprecated. use getEuler() instead."),this.getEuler(new re)}constructor(e,t){this.offsetFromHeadBone=new _,this.autoUpdate=!0,this.faceFront=new _(0,0,1),this.humanoid=e,this.applier=t,this._yaw=0,this._pitch=0,this._needsUpdate=!0,this._restHeadWorldQuaternion=this.getLookAtWorldQuaternion(new E)}getEuler(e){return e.set(P.DEG2RAD*this._pitch,P.DEG2RAD*this._yaw,0,"YXZ")}copy(e){if(this.humanoid!==e.humanoid)throw new Error("VRMLookAt: humanoid must be same in order to copy");return this.offsetFromHeadBone.copy(e.offsetFromHeadBone),this.applier=e.applier,this.autoUpdate=e.autoUpdate,this.target=e.target,this.faceFront.copy(e.faceFront),this}clone(){return new Ue(this.humanoid,this.applier).copy(this)}reset(){this._yaw=0,this._pitch=0,this._needsUpdate=!0}getLookAtWorldPosition(e){const t=this.humanoid.getRawBoneNode("head");return e.copy(this.offsetFromHeadBone).applyMatrix4(t.matrixWorld)}getLookAtWorldQuaternion(e){const t=this.humanoid.getRawBoneNode("head");return or(t,e)}getFaceFrontQuaternion(e){if(this.faceFront.distanceToSquared(xn)<.01)return e.copy(this._restHeadWorldQuaternion).invert();const[t,n]=Mt(this.faceFront);return yt.set(0,.5*Math.PI+t,n,"YZX"),e.setFromEuler(yt).premultiply(ur.copy(this._restHeadWorldQuaternion).invert())}getLookAtWorldDirection(e){return this.getLookAtWorldQuaternion(xt),this.getFaceFrontQuaternion(yn),e.copy(xn).applyQuaternion(xt).applyQuaternion(yn).applyEuler(this.getEuler(yt))}lookAt(e){const t=lr.copy(this._restHeadWorldQuaternion).multiply(tr(this.getLookAtWorldQuaternion(xt))),n=this.getLookAtWorldPosition(sr),i=ar.copy(e).sub(n).applyQuaternion(t).normalize(),[o,r]=Mt(this.faceFront),[s,a]=Mt(i),l=Mn(s-o),u=Mn(r-a);this._yaw=P.RAD2DEG*l,this._pitch=P.RAD2DEG*u,this._needsUpdate=!0}update(e){this.target!=null&&this.autoUpdate&&this.lookAt(this.target.getWorldPosition(rr)),this._needsUpdate&&(this._needsUpdate=!1,this.applier.applyYawPitch(this._yaw,this._pitch))}}Ue.EULER_ORDER="YXZ";new _(0,0,1);const Tn=180/Math.PI,Tt=new re;class wn extends pe{constructor(e){super(),this.vrmLookAt=e,this.type="VRMLookAtQuaternionProxy";const t=this.rotation._onChangeCallback;this.rotation._onChange(()=>{t(),this._applyToLookAt()});const n=this.quaternion._onChangeCallback;this.quaternion._onChange(()=>{n(),this._applyToLookAt()})}_applyToLookAt(){Tt.setFromQuaternion(this.quaternion,Ue.EULER_ORDER),this.vrmLookAt.yaw=Tn*Tt.y,this.vrmLookAt.pitch=Tn*Tt.x}}function dr(d,e,t){var n,i;const o=new Map,r=new Map;for(const[s,a]of d.humanoidTracks.rotation.entries()){const l=(n=e.getNormalizedBoneNode(s))===null||n===void 0?void 0:n.name;if(l!=null){const u=new Ei(`${l}.quaternion`,a.times,a.values.map((c,f)=>t==="0"&&f%2===0?-c:c));r.set(s,u)}}for(const[s,a]of d.humanoidTracks.translation.entries()){const l=(i=e.getNormalizedBoneNode(s))===null||i===void 0?void 0:i.name;if(l!=null){const u=d.restHipsPosition.y,f=e.normalizedRestPose.hips.position[1]/u,h=a.clone();h.values=h.values.map((m,p)=>(t==="0"&&p%3!==1?-m:m)*f),h.name=`${l}.position`,o.set(s,h)}}return{translation:o,rotation:r}}function cr(d,e){const t=new Map,n=new Map;for(const[i,o]of d.expressionTracks.preset.entries()){const r=e.getExpressionTrackName(i);if(r!=null){const s=o.clone();s.name=r,t.set(i,s)}}for(const[i,o]of d.expressionTracks.custom.entries()){const r=e.getExpressionTrackName(i);if(r!=null){const s=o.clone();s.name=r,n.set(i,s)}}return{preset:t,custom:n}}function hr(d,e){if(d.lookAtTrack==null)return null;const t=d.lookAtTrack.clone();return t.name=e,t}function wr(d,e){const t=[],n=dr(d,e.humanoid,e.meta.metaVersion);if(t.push(...n.translation.values()),t.push(...n.rotation.values()),e.expressionManager!=null){const i=cr(d,e.expressionManager);t.push(...i.preset.values()),t.push(...i.custom.values())}if(e.lookAt!=null){let i=e.scene.children.find(r=>r instanceof wn);i==null?(console.warn("createVRMAnimationClip: VRMLookAtQuaternionProxy is not found. Creating a new one automatically. To suppress this warning, create a VRMLookAtQuaternionProxy manually"),i=new wn(e.lookAt),i.name="VRMLookAtQuaternionProxy",e.scene.add(i)):i.name==null&&(console.warn("createVRMAnimationClip: VRMLookAtQuaternionProxy is found but its name is not set. Setting the name automatically. To suppress this warning, set the name manually"),i.name="VRMLookAtQuaternionProxy");const o=hr(d,`${i.name}.quaternion`);o!=null&&t.push(o)}return new Ri("Clip",d.duration,t)}class pr{constructor(){this.duration=0,this.restHipsPosition=new _,this.humanoidTracks={translation:new Map,rotation:new Map},this.expressionTracks={preset:new Map,custom:new Map},this.lookAtTrack=null}}function Rn(d,e,t,n){function i(o){return o instanceof t?o:new t(function(r){r(o)})}return new(t||(t=Promise))(function(o,r){function s(u){try{l(n.next(u))}catch(c){r(c)}}function a(u){try{l(n.throw(u))}catch(c){r(c)}}function l(u){u.done?o(u.value):i(u.value).then(s,a)}l((n=n.apply(d,[])).next())})}function En(d,e){const t=d.length,n=[];let i=[],o=0;for(let r=0;r<t;r++){const s=d[r];o<=0&&(o=e,i=[],n.push(i)),i.push(s),o--}return n}const fr=new H,he=new _,wt=new E,Sn=new E,mr=new E,_r=new Set(["1.0","1.0-draft"]),vr=new Set(Object.values(er));class Rr{constructor(e){this.parser=e}get name(){return"VRMC_vrm_animation"}afterRoot(e){var t,n,i;return Rn(this,void 0,void 0,function*(){const o=e.parser.json,r=o.extensionsUsed;if(r==null||r.indexOf(this.name)==-1)return;const s=(t=o.extensions)===null||t===void 0?void 0:t[this.name];if(s==null)return;const a=s.specVersion;if(!_r.has(a)){console.warn(`VRMAnimationLoaderPlugin: Unknown VRMC_vrm_animation spec version: ${a}`);return}a==="1.0-draft"&&console.warn("VRMAnimationLoaderPlugin: Using a draft spec version: 1.0-draft. Some behaviors may be different. Consider updating the animation file.");const l=this._createNodeMap(s),u=yield this._createBoneWorldMatrixMap(e,s),c=(i=(n=s.humanoid)===null||n===void 0?void 0:n.humanBones.hips)===null||i===void 0?void 0:i.node,f=c!=null?yield e.parser.getDependency("node",c):null,h=new _;f==null||f.getWorldPosition(h);const p=e.animations.map((g,v)=>{const M=o.animations[v],y=this._parseAnimation(g,M,l,u);return y.restHipsPosition=h,y});e.userData.vrmAnimations=p})}_createNodeMap(e){var t,n,i,o,r;const s=new Map,a=new Map,l=(t=e.humanoid)===null||t===void 0?void 0:t.humanBones;l&&Object.entries(l).forEach(([h,m])=>{const p=m==null?void 0:m.node;p!=null&&s.set(p,h)});const u=(n=e.expressions)===null||n===void 0?void 0:n.preset;u&&Object.entries(u).forEach(([h,m])=>{const p=m==null?void 0:m.node;p!=null&&a.set(p,h)});const c=(i=e.expressions)===null||i===void 0?void 0:i.custom;c&&Object.entries(c).forEach(([h,m])=>{const{node:p}=m;a.set(p,h)});const f=(r=(o=e.lookAt)===null||o===void 0?void 0:o.node)!==null&&r!==void 0?r:null;return{humanoidIndexToName:s,expressionsIndexToName:a,lookAtIndex:f}}_createBoneWorldMatrixMap(e,t){var n,i;return Rn(this,void 0,void 0,function*(){e.scene.updateWorldMatrix(!1,!0);const o=yield e.parser.getDependencies("node"),r=new Map;if(t.humanoid==null)return r;for(const[s,a]of Object.entries(t.humanoid.humanBones)){const l=a==null?void 0:a.node;if(l!=null){const u=o[l];r.set(s,u.matrixWorld),s==="hips"&&r.set("hipsParent",(i=(n=u.parent)===null||n===void 0?void 0:n.matrixWorld)!==null&&i!==void 0?i:fr)}}return r})}_parseAnimation(e,t,n,i){const o=e.tracks,r=t.channels,s=new pr;return s.duration=e.duration,r.forEach((a,l)=>{const{node:u,path:c}=a.target,f=o[l];if(u==null)return;const h=n.humanoidIndexToName.get(u);if(h!=null){let p=gn[h];for(;p!=null&&i.get(p)==null;)p=gn[p];if(p??(p="hipsParent"),c==="translation")if(h!=="hips")console.warn(`The loading animation contains a translation track for ${h}, which is not permitted in the VRMC_vrm_animation spec. ignoring the track`);else{const g=i.get("hipsParent"),v=En(f.values,3).flatMap(y=>he.fromArray(y).applyMatrix4(g).toArray()),M=f.clone();M.values=new Float32Array(v),s.humanoidTracks.translation.set(h,M)}else if(c==="rotation"){const g=i.get(h),v=i.get(p);g.decompose(he,wt,he),wt.invert(),v.decompose(he,Sn,he);const M=En(f.values,4).flatMap(x=>mr.fromArray(x).premultiply(Sn).multiply(wt).toArray()),y=f.clone();y.values=new Float32Array(M),s.humanoidTracks.rotation.set(h,y)}else throw new Error(`Invalid path "${c}"`);return}const m=n.expressionsIndexToName.get(u);if(m!=null){if(c==="translation"){const p=f.times,g=new Float32Array(f.values.length/3);for(let M=0;M<g.length;M++)g[M]=f.values[3*M];const v=new wi(`${m}.weight`,p,g);vr.has(m)?s.expressionTracks.preset.set(m,v):s.expressionTracks.custom.set(m,v)}else throw new Error(`Invalid path "${c}"`);return}if(u===n.lookAtIndex)if(c==="rotation")s.lookAtTrack=f;else throw new Error(`Invalid path "${c}"`)}),s}}export{Ne as V,Tr as a,Rr as b,wr as c};
