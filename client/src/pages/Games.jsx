import React,{useEffect,useMemo,useRef,useState} from 'react';
import api from '../api';
import {CheckCircle,Sparkles,LogOut,Brain,Target,Grid3X3,RotateCcw} from 'lucide-react';

const BASE_EMOJIS=['🍎','🌸','🦋','🏠','🐘','⭐','🍀','🎵','🐶','🚗'];
const MAX_LEVEL=4;
const GAME_INFO=[
  {id:'memory',name:'Memory Match',icon:'🧠',desc:'Match hidden pairs across 3 automatic rounds.',tag:'Memory'},
  {id:'attention',name:'Find the Number',icon:'🎯',desc:'Remember the target, then find it after it disappears.',tag:'Attention'},
  {id:'pattern',name:'Memory Pattern',icon:'✨',desc:'Watch a pattern light up, then rebuild it from memory.',tag:'Visual Memory'}
];
function shuffle(a){return [...a].sort(()=>Math.random()-0.5)}
function saveResult(game,score,mistakes,accuracy,startedAt,level){return api.post('/games/result',{game,score,duration:startedAt?Math.max(1,Math.round((Date.now()-startedAt)/1000)):0,mistakes,level,accuracy});}

export default function Games({user}){
  const [selected,setSelected]=useState(null),[completed,setCompleted]=useState(null),[history,setHistory]=useState([]);
  const loadHistory=()=>api.get('/games/history').then(r=>setHistory(Array.isArray(r.data)?r.data:[])).catch(()=>{});
  useEffect(()=>{if(user.role==='patient')loadHistory()},[user]);
  if(user.role!=='patient')return <div className="page"><div className="page-head"><div><span className="pill">Cognitive Analytics</span><h1>Game analytics</h1><p>Patient game performance is stored for care and trend analysis.</p></div></div><div className="panel"><h3><Sparkles/> Cognitive game signals</h3><p className="muted">Memory and attention game results can be reviewed with daily check-up and medicine information.</p></div></div>;
  const levelFor=(game)=>Math.min(MAX_LEVEL,1+history.filter(x=>x.game===game).length);
  const finish=async result=>{
    const level=Math.min(MAX_LEVEL,result.level||levelFor(result.game));
    try{await saveResult(result.game,result.score,result.mistakes,result.accuracy,result.startedAt,level)}catch{}
    setCompleted({...result,level});await loadHistory();setSelected(null);
  };
  return <div className="page">
    <div className="page-head"><div><span className="pill">Cognitive Games</span><h1>{selected?'Focus & play':'Choose a memory exercise'}</h1><p>{selected?'Relax, concentrate and take your time.':'Short, friendly exercises with progressive difficulty — no exam-style questions.'}</p></div></div>
    {!selected?<div className="game-library">{GAME_INFO.map(g=><button className="game-choice game-choice-attractive" key={g.id} onClick={()=>{setCompleted(null);setSelected(g.id)}}><span className="game-icon">{g.icon}</span><div><strong>{g.name}</strong><small>{g.desc}</small><em>{g.tag} • Up to Level {MAX_LEVEL}</em><span className="play-hint">Play now →</span></div></button>)}</div>
    :<Game selected={selected} level={levelFor(GAME_INFO.find(g=>g.id===selected)?.name)} onBack={()=>setSelected(null)} onFinish={finish}/>} 
    {completed&&<div className="success"><CheckCircle size={18}/> {completed.game} completed! Level {completed.level}/{MAX_LEVEL} • Score <b>{completed.score}</b> • Accuracy <b>{completed.accuracy}%</b></div>}
    <div className="note"><Sparkles size={16}/> Each completed session unlocks the next difficulty. Maximum difficulty is Level {MAX_LEVEL}.</div>
  </div>
}
function Game({selected,level,onBack,onFinish}){if(selected==='memory')return <Memory onBack={onBack} onFinish={onFinish} level={level}/>;if(selected==='pattern')return <Pattern onBack={onBack} onFinish={onFinish} level={level}/>;return <Attention onBack={onBack} onFinish={onFinish} level={level}/>;}
function Frame({title,icon,onBack,level,children}){return <div className="panel game-panel"><div className="game-top"><strong>{icon} {title} <span className="role-chip">Level {level}/4</span></strong><button className="secondary" onClick={onBack}><LogOut size={16}/> Exit Game</button></div>{children}</div>}

function Memory({onBack,onFinish,level}){
  const totalRounds=3;
  const [round,setRound]=useState(1),[cards,setCards]=useState([]),[flipped,setFlipped]=useState([]),[matched,setMatched]=useState([]),[mistakes,setMistakes]=useState(0),[score,setScore]=useState(0),[roundDone,setRoundDone]=useState(false),[roundMessage,setRoundMessage]=useState(''),[busy,setBusy]=useState(false);
  const [startedAt]=useState(Date.now());
  const transitionRef=useRef(null),mismatchRef=useRef(null);
  const pairCount=Math.min(8,2+level+round-2);

  const buildRound=()=>{
    const symbols=BASE_EMOJIS.slice(0,pairCount);
    setCards(shuffle([...symbols,...symbols]).map((v,i)=>({id:i,v})));
    setFlipped([]);setMatched([]);setRoundDone(false);setRoundMessage('');setBusy(false);
  };
  useEffect(()=>{buildRound();return()=>{clearTimeout(transitionRef.current);clearTimeout(mismatchRef.current)}},[round,pairCount]);

  useEffect(()=>{
    if(!cards.length||matched.length!==cards.length||roundDone||busy)return;
    setBusy(true);setRoundDone(true);
    if(round<totalRounds){
      setRoundMessage(`✓ Round ${round} complete! Starting Round ${round+1}…`);
      transitionRef.current=setTimeout(()=>setRound(r=>r+1),900);
    }else{
      setRoundMessage('✓ All 3 rounds complete! Saving your result…');
      transitionRef.current=setTimeout(()=>{
        const totalPairs=Math.max(1,matched.length/2 + (round-1)*pairCount/2);
        const accuracy=Math.max(0,Math.min(100,Math.round((totalPairs/(totalPairs+mistakes))*100)));
        onFinish({game:'Memory Match',score,mistakes,accuracy,startedAt,level:Math.min(MAX_LEVEL,level+1)});
      },900);
    }
    return()=>clearTimeout(transitionRef.current);
  },[matched.length,cards.length,roundDone,busy,round,score,pairCount,mistakes,level,onFinish,startedAt]);

  const flip=i=>{
    if(roundDone||busy||flipped.length>=2||flipped.includes(i)||matched.includes(i))return;
    const next=[...flipped,i];setFlipped(next);
    if(next.length===2){
      if(cards[next[0]].v===cards[next[1]].v){
        const nextMatched=[...matched,...next];setMatched(nextMatched);setFlipped([]);setScore(s=>s+10*level);
      }else{
        setMistakes(m=>m+1);clearTimeout(mismatchRef.current);mismatchRef.current=setTimeout(()=>setFlipped([]),550);
      }
    }
  };
  return <Frame title="Memory Match" icon="🧠" onBack={onBack} level={Math.min(MAX_LEVEL,level+round-1)}>
    <div className="game-stats"><span>Round <b>{round}/{totalRounds}</b></span><span>Pairs <b>{pairCount}</b></span><span>Score <b>{score}</b></span><span>Mistakes <b>{mistakes}</b></span></div>
    <div className="memory-tip">💡 Match every pair. The next round starts automatically — no button is required.</div>
    <div className="memory-grid">{cards.map(c=><button type="button" aria-label={flipped.includes(c.id)||matched.includes(c.id)?`Card ${c.v}`:'Hidden card'} key={c.id} className={`memory-card ${flipped.includes(c.id)||matched.includes(c.id)?'show':''} ${matched.includes(c.id)?'matched':''}`} onClick={()=>flip(c.id)}>{flipped.includes(c.id)||matched.includes(c.id)?c.v:'?'}</button>)}</div>
    {roundDone&&<div className="round-message success">{roundMessage}</div>}
  </Frame>
}
function Attention({onBack,onFinish,level}){
  const [currentLevel,setCurrentLevel]=useState(Math.min(MAX_LEVEL,Math.max(1,level))),[round,setRound]=useState(1),[visible,setVisible]=useState(true),[ans,setAns]=useState(null),[message,setMessage]=useState(''),[mistakes,setMistakes]=useState(0),[score,setScore]=useState(0),[startedAt]=useState(Date.now());
  const config={1:{size:9,showMs:2200,target:7},2:{size:12,showMs:1900,target:7},3:{size:16,showMs:1600,target:8},4:{size:20,showMs:1300,target:9}}[currentLevel];
  const makeNumbers=()=>{const a=Array.from({length:config.size},()=>{let n=1+Math.floor(Math.random()*9);while(n===config.target)n=1+Math.floor(Math.random()*9);return n});a[Math.floor(Math.random()*config.size)]=config.target;return shuffle(a)};
  const [nums,setNums]=useState(makeNumbers);
  useEffect(()=>{setVisible(true);setAns(null);setMessage('');const t=setTimeout(()=>setVisible(false),config.showMs);return()=>clearTimeout(t)},[currentLevel,round,config.showMs]);
  const correct=nums.indexOf(config.target);
  const choose=i=>{if(ans!==null)return;setAns(i);if(i===correct){setScore(s=>s+100*currentLevel);setMessage('✓ Correct! Next level loading…')}else{setMistakes(m=>m+1);setMessage('✗ Not correct. The next level will use a new target.')};setTimeout(()=>{if(currentLevel<MAX_LEVEL){setCurrentLevel(l=>l+1);setRound(r=>r+1);setNums(makeNumbers())}else{const finalScore=score+(i===correct?100*currentLevel:0);const accuracy=Math.max(0,Math.round(((round-1+(i===correct?1:0))/Math.max(1,round))*100));onFinish({game:'Find the Number',score:finalScore,mistakes:mistakes+(i===correct?0:1),accuracy,startedAt,level:MAX_LEVEL})}},800)};
  return <Frame title="Find the Number" icon="🎯" onBack={onBack} level={currentLevel}>
    <div className="memory-study"><div className="level-progress"><span>Level {currentLevel} of {MAX_LEVEL}</span><div><i style={{width:`${currentLevel/MAX_LEVEL*100}%`}}/></div></div>
      {visible?<><h2>Remember this number</h2><div className="target-number pulse">{config.target}</div><p className="muted">Look carefully — it disappears in {config.showMs/1000}s.</p></>:<><h2>Which number did you remember?</h2><div className="number-grid">{nums.map((n,i)=><button type="button" className={ans===i?(i===correct?'correct-outline':'wrong-outline'):''} key={i} onClick={()=>choose(i)}>{n}</button>)}</div>{message&&<div className={`answer-feedback ${ans===correct?'correct':'wrong'}`}>{message}</div>}</>}
    </div>
  </Frame>
}

function Pattern({onBack,onFinish,level}){
  const configs={1:{size:3,count:3,show:1800},2:{size:4,count:4,show:1700},3:{size:5,count:5,show:1500},4:{size:5,count:7,show:1250}};
  const [currentLevel,setCurrentLevel]=useState(Math.min(MAX_LEVEL,Math.max(1,level))),[pattern,setPattern]=useState([]),[selected,setSelected]=useState([]),[showing,setShowing]=useState(true),[message,setMessage]=useState(''),[mistakes,setMistakes]=useState(0),[score,setScore]=useState(0),[startedAt]=useState(Date.now());
  const cfg=configs[currentLevel];
  const makePattern=()=>shuffle(Array.from({length:cfg.size*cfg.size},(_,i)=>i)).slice(0,cfg.count);
  useEffect(()=>{const p=makePattern();setPattern(p);setSelected([]);setShowing(true);setMessage('');const t=setTimeout(()=>setShowing(false),cfg.show);return()=>clearTimeout(t)},[currentLevel,cfg.size,cfg.count,cfg.show]);
  const tap=i=>{if(showing||selected.includes(i))return;const next=[...selected,i];setSelected(next);if(next.length===cfg.count){const ok=pattern.every(x=>next.includes(x))&&next.length===pattern.length;setMessage(ok?'✓ Perfect pattern! Next level loading…':'✗ Almost! Watch the next pattern carefully.');if(!ok)setMistakes(m=>m+1);if(ok)setScore(s=>s+100*currentLevel);setTimeout(()=>{if(currentLevel<MAX_LEVEL){setCurrentLevel(l=>l+1)}else{const final=score+(ok?100*currentLevel:0);const accuracy=Math.max(0,Math.round(((currentLevel-1+(ok?1:0))/currentLevel)*100));onFinish({game:'Memory Pattern',score:final,mistakes:mistakes+(ok?0:1),accuracy,startedAt,level:MAX_LEVEL})}},900)}};
  return <Frame title="Memory Pattern" icon="✨" onBack={onBack} level={currentLevel}><div className="pattern-game"><div className="level-progress"><span>{showing?'Watch the pattern':'Rebuild the pattern'} • Level {currentLevel}/{MAX_LEVEL}</span><div><i style={{width:`${currentLevel/MAX_LEVEL*100}%`}}/></div></div><div className={`pattern-grid size-${cfg.size}`}>{Array.from({length:cfg.size*cfg.size},(_,i)=><button key={i} type="button" aria-label={`Pattern tile ${i+1}`} className={`${showing&&pattern.includes(i)?'lit ':''}${selected.includes(i)?'selected ':''}`} onClick={()=>tap(i)}>{selected.includes(i)?'✓':''}</button>)}</div><p className="muted">{showing?`Memorize ${cfg.count} glowing tiles.`:'Tap the same tiles in any order.'}</p>{message&&<div className={`answer-feedback ${message.startsWith('✓')?'correct':'wrong'}`}>{message}</div>}</div></Frame>
}
