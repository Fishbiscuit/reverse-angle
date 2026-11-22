import { readPhoto, checkReply } from './reader.js';

const get = (id) => document.getElementById(id);
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const anchors = [[.725,.208],[.663,.213]];
const cutPhoto = get('cut-photo');
const cutImage = get('cut-image');
const cutButton = get('play');
const views = [get('sheet'),get('walk'),get('player')];
const roomStage = get('room-stage');

let original;
let reply;
let publishedDemo;
let angle = 'front';
let pendingRoom;
let room;
let cutRun = 0;
let curtain;

function status(message = '') {
  get('status').textContent = message;
  get('status').hidden = !message;
}

function postCard(post, isReply) {
  const card = get('post-template').content.firstElementChild.cloneNode(true);
  if (isReply) card.classList.add('reply');
  card.querySelector('.author').textContent = post.author;
  const publisher = new URL(post.origin);
  card.querySelector('.origin').textContent = publisher.host + publisher.pathname.replace(/\/$/,'');
  card.querySelector('.relation').textContent = isReply ? '↳ Photo reply' : 'Original photo';
  const image = card.querySelector('img');
  image.alt = post.alt || (isReply ? 'Photograph in the reply' : 'Photograph in the original post');
  image.src = post.photo;
  card.querySelector('.caption').textContent = post.caption;
  const source = card.querySelector('.source');
  source.href = post.page;
  if (isReply) source.firstChild.textContent = 'Open reply on its blog ';
  return card;
}

function renderSheet() {
  get('contacts').replaceChildren(postCard(original,false), ...(reply ? [postCard(reply,true)] : []));
  for (const image of get('contacts').querySelectorAll('img')) image.addEventListener('load',fitSheet);
  fitSheet();
}

function renderPoint() {
  const back = angle === 'back';
  get('front').setAttribute('aria-pressed',String(!back));
  get('back').setAttribute('aria-pressed',String(back));
  const post = back ? reply : original;
  if (post) get('viewpoint').replaceChildren(postCard(post,back));
  else get('viewpoint').replaceChildren();
  room?.move(angle,reduce.matches);
}

function open(next) {
  for (const part of views) part.hidden=part.id!==next;
  get('sheet-tab').setAttribute('aria-pressed',String(next==='sheet'));
  get('room-tab').setAttribute('aria-pressed',String(next==='walk'));
  cutButton.hidden=next!=='sheet';
  if (next==='sheet') fitSheet();
}

function cancelCut() {
  cutRun++;
  curtain?.cancel();
  get('next-cut').hidden=true;
}

get('sheet-tab').addEventListener('click',()=>{
  cancelCut();open('sheet');
});

get('room-tab').addEventListener('click',async()=>{
  cancelCut();open('walk');renderPoint();
  if (!pendingRoom) {
    pendingRoom=import('./room.js').then(({createRoom})=>{
      room=createRoom(roomStage);
      renderPoint();
    }).catch(()=>{
      roomStage.replaceChildren(document.createTextNode('3D is unavailable in this browser. Both viewpoints and their photos are still available.'));
    });
  }
  await pendingRoom;
});

for (const side of ['front','back']) get(side).addEventListener('click',()=>{
  angle=side;renderPoint();
});

function crop(box, image, point, source = image) {
  const width=box.clientWidth;
  const height=box.clientHeight;
  if (!point || !source.naturalWidth || !width || !height) {
    for(const prop of ['width','height','left','top'])image.style.removeProperty(prop);
    return;
  }
  const x=point[0]*source.naturalWidth;
  const y=point[1]*source.naturalHeight;
  const left=.69*width;
  const top=.21*height;
  const scale=Math.max(left/x,(width-left)/(source.naturalWidth-x),top/y,(height-top)/(source.naturalHeight-y));
  image.style.width=`${source.naturalWidth*scale}px`;
  image.style.height=`${source.naturalHeight*scale}px`;
  image.style.left=`${left-x*scale}px`;
  image.style.top=`${top-y*scale}px`;
}

let cutIndex=0;
function aligns() { return publishedDemo && reply?.id===publishedDemo.id && reply.origin===publishedDemo.origin; }
function fitSheet() {
  get('contacts').querySelectorAll('.shot').forEach((box,index)=>{
    crop(box,box.querySelector('img'),aligns()?anchors[index]:null);
  });
}
new ResizeObserver(fitSheet).observe(get('contacts'));
function placeCutImage() { crop(cutPhoto,cutImage,aligns()?anchors[cutIndex]:null); }
new ResizeObserver(placeCutImage).observe(cutPhoto);
cutImage.addEventListener('load',placeCutImage);

function paintCut(index) {
  cutIndex=index;
  const post=index ? reply : original;
  cutImage.src=post.photo;
  cutImage.alt=post.alt;
  get('player-caption').textContent=post.author+' · '+(index?'Photo reply':'Original photo');
  get('match-mark').hidden=!aligns();
  placeCutImage();
}

async function landCut() {
  const before=cutPhoto.getBoundingClientRect();
  open('sheet');
  const destination=get('contacts').querySelector('.reply .shot');
  const after=destination.getBoundingClientRect();
  if (!after.width || !before.width) return;
  const carrier=document.createElement('div');
  const image=cutImage.cloneNode();
  image.removeAttribute('id');
  carrier.className='flying';
  carrier.setAttribute('aria-hidden','true');
  Object.assign(carrier.style,{width:`${after.width}px`,height:`${after.height}px`,left:`${after.left}px`,top:`${after.top}px`});
  carrier.append(image);
  document.body.append(carrier);
  crop(carrier,image,aligns()?anchors[1]:null,cutImage);
  destination.style.visibility='hidden';
  const flight=carrier.animate([
    {transform:`translate(${before.left-after.left}px,${before.top-after.top}px) scale(${before.width/after.width},${before.height/after.height})`},
    {transform:'translate(0,0) scale(1)'},
  ],{duration:700,easing:'cubic-bezier(.23,.76,.2,1)',fill:'both'});
  curtain=flight;
  try { await flight.finished; }
  catch(error) { if (error.name!=='AbortError') throw error; }
  finally { carrier.remove();destination.style.visibility='';if(curtain===flight)curtain=null; }
}

const wait=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
cutButton.addEventListener('click',async()=>{
  if (!original||!reply) return;
  const run=++cutRun;
  open('player');paintCut(0);
  get('exit-cut').focus({preventScroll:true});
  if(reduce.matches){ get('next-cut').hidden=false;return; }
  const preload=new Image();
  preload.src=reply.photo;
  await Promise.all([wait(540),preload.decode().catch(()=>{})]);
  if(run!==cutRun)return;
  paintCut(1);
  await wait(1120);
  if(run!==cutRun)return;
  await landCut();
  if(run===cutRun)cutButton.focus({preventScroll:true});
});
get('next-cut').addEventListener('click',()=>{paintCut(1);get('next-cut').hidden=true;get('exit-cut').focus();});
get('exit-cut').addEventListener('click',()=>{cancelCut();open('sheet');cutButton.focus();});

get('reply-form').addEventListener('submit',async(event)=>{
  event.preventDefault();
  const button=event.currentTarget.querySelector('button');
  button.disabled=true;
  const message=get('reply-status');
  message.textContent='Checking the publication and its reply link…';
  try {
    const post=checkReply(original,await readPhoto(get('reply-link').value));
    reply=post;renderSheet();renderPoint();
    cutButton.disabled=false;
    get('back').disabled=false;
    cutButton.firstChild.textContent=aligns()?'Watch the match cut ':'Compare the photos ';
    message.textContent='Showing '+post.author+'’s reply in this session.';
  } catch(error){
    message.textContent=error.message==='Failed to fetch'
      ? 'The browser could not read that blog. Use its public item link and a host that permits cross-site reads.'
      : error.message;
  } finally {button.disabled=false;}
});

async function load() {
  const response=await fetch('./scene.json',{cache:'no-store'});
  if(!response.ok)throw new Error('The scene’s source list is unavailable.');
  const scene=await response.json();
  get('demo-note').hidden=!scene.demo;
  original=await readPhoto(new URL(scene.original,response.url));
  if(scene.reply){
    try{
      reply=checkReply(original,await readPhoto(new URL(scene.reply,response.url)));
      if(scene.demo)publishedDemo=reply;
    }catch(error){status('The curated reply is unavailable. '+error.message);}
  }
  cutButton.disabled=!reply;
  get('back').disabled=!reply;
  get('ingest').hidden=false;
  renderSheet();renderPoint();
}
load().catch((error)=>{
  get('contacts').replaceChildren();
  status(error.message);
});
