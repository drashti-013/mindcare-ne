import React,{useEffect,useMemo,useRef,useState} from 'react';
import api from '../api';
import {Brain,CheckCircle,Info,Sparkles,Grid3X3,Hash,RotateCcw} from 'lucide-react';

const WORD_POOL=['River','Apple','Chair','Moon','Garden','Phone','Cloud','Bottle','Tree','Book'];
const MAX_LEVEL=4;
const CHECKUP_GAMES=[
  {id:'visual',name:'Visual Memory',icon:'🧩',tag:'AI Memory',desc:'Remember glowing positions and rebuild the pattern.',accent:'Visual memory'},
  {id:'words',name:'Word Recall',icon:'🧠',tag:'AI Memory',desc:'Study everyday words, then select the ones you remember.',accent:'Verbal memory'},
  {id:'numbers',name:'Number Recall',icon:'🔢',tag:'AI Memory',desc:'Remember a short set of digits after it disappears.',accent:'Working memory'}
];

function shuffle(a){return [...a].sort(()=>Math.random()-.5)}

export default function Assessment({user}){
  if(user.role!=='patient') return <ProfessionalAssessment/>;
  const [started,setStarted]=useState(false);
  const [game,setGame]=useState('visual');
  const [level,setLevel]=useState(1);
  const [score,setScore]=useState(0);
  const [mistakes,setMistakes]=useState(0);
  const [round,setRound]=useState(1);
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [phase,setPhase]=useState('watch');
  const [feedback,setFeedback]=useState('');
  const [pattern,setPattern]=useState([]);
  const [selected,setSelected]=useState([]);
  const [words,setWords]=useState([]);
  const [wordChoice,setWordChoice]=useState([]);
  const [numbers,setNumbers]=useState('');
  const [numberInput,setNumberInput]=useState('');
  const [roundResults,setRoundResults]=useState([]);
  const timer=useRef(null);
  const startedAt=useRef(Date.now());

  const config=useMemo(()=>({
    visual:{1:{size:3,count:3,show:1800},2:{size:4,count:4,show:1700},3:{size:5,count:5,show:1500},4:{size:5,count:7,show:1250}},
    words:{1:{count:4,show:4000},2:{count:5,show:3800},3:{count:6,show:3500},4:{count:7,show:3200}},
    numbers:{1:{digits:3,show:2600},2:{digits:4,show:2400},3:{digits:5,show:2100},4:{digits:6,show:1800}}
  })[game][level],[game,level]);

  useEffect(()=>()=>clearTimeout(timer.current),[]);

  const makeRound=()=>{
    clearTimeout(timer.current);
    setPhase('watch');setFeedback('');setSelected([]);setWordChoice([]);setNumberInput('');
    if(game==='visual'){
      const total=config.size*config.size;
      setPattern(shuffle(Array.from({length:total},(_,i)=>i)).slice(0,config.count));
    }else if(game==='words'){
      setWords(shuffle(WORD_POOL).slice(0,config.count));
    }else{
      let s=''; for(let i=0;i<config.digits;i++) s+=Math.floor(Math.random()*10); setNumbers(s);
    }
    timer.current=setTimeout(()=>setPhase('answer'),config.show);
  };

  const start=()=>{
    setStarted(true);setResult(null);setScore(0);setMistakes(0);setRound(1);setLevel(1);setRoundResults([]);startedAt.current=Date.now();
  };

  useEffect(()=>{if(started)makeRound()},[started,game,level,round]);

  const finishRound=(ok,earned)=>{
    clearTimeout(timer.current);
    const nextScore=score+earned;
    const nextMistakes=mistakes+(ok?0:1);
    setScore(nextScore);setMistakes(nextMistakes);setRoundResults(r=>[...r,{game,level,ok}]);
    setFeedback(ok?'✓ Correct! Preparing the next memory challenge…':'✗ Not quite. The next challenge will be a little different.');
    setPhase('feedback');
    setTimeout(()=>{
      if(level<MAX_LEVEL){setLevel(l=>l+1);setRound(r=>r+1)}
      else submitAI(nextScore,nextMistakes);
    },900);
  };

  const submitAI=async(finalScore,finalMistakes)=>{
    setLoading(true);
    const accuracy=Math.max(0,Math.min(100,Math.round((finalScore/(MAX_LEVEL*100))*100)));
    const cognitiveScore=Number((accuracy/10).toFixed(1));
    try{
      const r=await api.post('/assessments',{
        memory:cognitiveScore,
        attention:cognitiveScore,
        orientation:cognitiveScore,
        language:cognitiveScore,
        reactionTimeMs:700,
        gameAccuracy:accuracy,
        game:CHECKUP_GAMES.find(x=>x.id===game)?.name||'Visual Memory',
        checkupType:'AI Memory Games'
      });
      setResult(r.data);setStarted(false);
    }catch(e){alert(e.response?.data?.message||'Could not save the AI check-up. Please try again.')}finally{setLoading(false)}
  };

  const choosePattern=i=>{
    if(phase!=='answer'||selected.includes(i))return;
    const next=[...selected,i];setSelected(next);
    if(next.length===pattern.length){
      const ok=pattern.every(x=>next.includes(x));
      finishRound(ok,ok?100*level:0);
    }
  };

  const submitWords=()=>{
    if(wordChoice.length!==config.count)return;
    const correct=wordChoice.filter(w=>words.includes(w)).length;
    const ok=correct===config.count;
    finishRound(ok,Math.round((correct/config.count)*100));
  };

  const submitNumber=()=>{
    if(!numberInput.trim())return;
    const ok=numberInput.trim()===numbers;
    finishRound(ok,ok?100*level:Math.round(Math.max(0,1-(Math.abs(Number(numberInput)-Number(numbers))/Math.max(1,Number(numbers))))*100));
  };

  if(!started&&!result)return <div className="page">
    <section className="hero checkup-hero"><div><span className="pill">AI Memory Check-up</span><h1>Daily memory check, without exam questions</h1><p>Choose one short AI-related memory game. The system measures your performance across 4 progressive levels and creates a simple support signal.</p><button className="primary" onClick={start}><Sparkles/> Start AI memory check</button></div><div className="hero-art"><Brain size={100}/></div></section>
    <div className="checkup-game-library">{CHECKUP_GAMES.map(g=><button key={g.id} className={`checkup-game-card ${game===g.id?'active':''}`} onClick={()=>setGame(g.id)}><span>{g.icon}</span><div><b>{g.name}</b><small>{g.desc}</small><em>{g.tag} • 4 levels</em></div></button>)}</div>
    <div className="note"><Info size={16}/> These are cognitive-wellness activities, not academic/semester questions and not a dementia diagnosis.</div>
  </div>;

  if(result)return <Result result={result} onRestart={()=>{setResult(null);setStarted(false);setLevel(1);setRound(1);setScore(0);setMistakes(0)}}/>;

  const gameTitle=CHECKUP_GAMES.find(x=>x.id===game)?.name;
  return <div className="page"><div className="page-head"><div><span className="pill">AI Memory Check-up</span><h1>{gameTitle}</h1><p>Level {level} of {MAX_LEVEL} • Challenge {round} of {MAX_LEVEL}</p></div></div><div className="panel assessment-task ai-memory-task">
    <div className="level-progress"><span>Progress • Level {level}/{MAX_LEVEL}</span><div><i style={{width:`${level/MAX_LEVEL*100}%`}}/></div></div>
    {game==='visual'&&<VisualTask phase={phase} pattern={pattern} config={config} selected={selected} onChoose={choosePattern} feedback={feedback}/>} 
    {game==='words'&&<WordTask phase={phase} words={words} config={config} choice={wordChoice} setChoice={setWordChoice} submit={submitWords} feedback={feedback}/>} 
    {game==='numbers'&&<NumberTask phase={phase} numbers={numbers} input={numberInput} setInput={setNumberInput} submit={submitNumber} feedback={feedback}/>} 
    {phase==='feedback'&&<div className={`answer-feedback ${feedback.startsWith('✓')?'correct':'wrong'}`}>{feedback}</div>}
    {loading&&<p className="muted ai-analyzing">✨ AI is analyzing your memory-game performance…</p>}
  </div><div className="grid cards checkup-stats"><Mini icon={Brain} title="Score" text={score}/><Mini icon={Grid3X3} title="Level" text={`${level}/${MAX_LEVEL}`}/><Mini icon={CheckCircle} title="Mistakes" text={mistakes}/><Mini icon={Sparkles} title="Mode" text="AI Memory"/></div><div className="note"><Info size={16}/> The AI result is a prototype wellness signal based on observable game performance. It is not a medical diagnosis.</div></div>;
}

function VisualTask({phase,pattern,config,selected,onChoose,feedback}){return <div className="memory-mini"><h2>{phase==='watch'?'Watch the glowing pattern':'Rebuild the pattern from memory'}</h2><p className="muted">{phase==='watch'?`Memorize ${config.count} glowing tiles. They disappear after ${config.show/1000}s.`:'Tap the same tiles in any order.'}</p><div className={`ai-pattern-grid size-${config.size}`}>{Array.from({length:config.size*config.size},(_,i)=><button type="button" key={i} className={phase==='watch'&&pattern.includes(i)?'lit':''} disabled={phase!=='answer'} onClick={()=>onChoose(i)}>{selected.includes(i)?'✓':''}</button>)}</div>{feedback&&phase==='feedback'&&<div className="answer-feedback">{feedback}</div>}</div>}

function WordTask({phase,words,config,choice,setChoice,submit,feedback}){const options=useMemo(()=>shuffle([...words,...shuffle(WORD_POOL.filter(x=>!words.includes(x))).slice(0,Math.min(4,10-words.length))]),[words]);return <div className="memory-mini"><h2>{phase==='watch'?'Remember these everyday words':'Which words did you remember?'}</h2><p className="muted">{phase==='watch'?`Study ${config.count} words carefully.`:`Select exactly ${config.count} words.`}</p>{phase==='watch'?<div className="word-memory-display">{words.map(w=><span key={w}>{w}</span>)}</div>:<><div className="word-memory-options">{options.map(w=><button type="button" className={choice.includes(w)?'selected':''} key={w} onClick={()=>setChoice(a=>a.includes(w)?a.filter(x=>x!==w):a.length<config.count?[...a,w]:a)}>{w}</button>)}</div><button className="primary" disabled={choice.length!==config.count} onClick={submit}>Check memory</button></>}</div>}

function NumberTask({phase,numbers,input,setInput,submit}){return <div className="memory-mini"><h2>{phase==='watch'?'Remember the number':'Enter the number you remember'}</h2><p className="muted">{phase==='watch'?'Look carefully. The number disappears before you answer.':'Type the digits in the same order.'}</p>{phase==='watch'?<div className="memory-number-display">{numbers}</div>:<><div className="number-entry"><Hash/><input inputMode="numeric" maxLength={numbers.length} value={input} onChange={e=>setInput(e.target.value.replace(/\D/g,''))} autoFocus placeholder="Enter number"/></div><button className="primary" disabled={input.length!==numbers.length} onClick={submit}>Check memory</button></>}</div>}

function Result({result,onRestart}){if(!result)return <div className="page"><div className="panel"><h2>Analysis unavailable</h2><button className="primary" onClick={onRestart}>Try again</button></div></div>;return <div className="page"><section className="hero"><div><span className="pill">AI result</span><h1>Your personalized support insight</h1><p>The model combines today's AI memory-game performance with recent game and medicine-routine signals.</p></div><div className={`ai-score ${String(result.aiRisk).toLowerCase()}`}>{result.aiRisk}<small>support priority</small></div></section><div className="grid cards"><Mini icon={Sparkles} title="AI probability" text={`${Math.round(result.aiProbability*100)}%`}/><Mini icon={Brain} title="Memory game" text={result.game||'AI Memory'}/><Mini icon={CheckCircle} title="Assessment" text="Recorded"/></div><div className="two"><section className="panel"><h3><Sparkles/> What AI noticed</h3>{result.aiReasons?.length?<ul className="insight-list">{result.aiReasons.map(x=><li key={x}>{x}</li>)}</ul>:<p>No major demo-level signals were detected in this check-up.</p>}<p className="muted">{result.aiRecommendation}</p></section><section className="panel"><h3><Brain/> What to do next</h3><p>{result.aiAction}</p><button className="secondary" onClick={onRestart}><RotateCcw/> Take again</button></section></div><div className="note"><Info size={16}/> AI model: {result.aiModel}, trained on synthetic demonstration records. This prototype is not a clinical diagnostic tool.</div></div>}
function Mini({icon:I,title,text}){return <div className="stat"><I/><div><small>{title}</small><strong>{text}</strong></div></div>}
function ProfessionalAssessment(){return <div className="page"><div className="page-head"><div><span className="pill">AI Patient Review</span><h1>Patient assessment insights</h1><p>Professionals review the patient's recorded AI memory-game check-up rather than performing the patient test.</p></div></div><div className="panel"><h3><Sparkles/> AI memory review</h3><div className="grid cards"><Mini icon={Brain} title="Memory games" text="Visual + verbal"/><Mini icon={Sparkles} title="Progressive" text="4 levels"/><Mini icon={CheckCircle} title="Observable" text="Game results"/><Mini icon={Info} title="Purpose" text="Support signal"/></div><p className="muted" style={{marginTop:18}}>The model estimates a support priority for this prototype. Doctors/caregivers should use trends as a prompt for follow-up, not as an automated medical decision.</p></div></div>}
