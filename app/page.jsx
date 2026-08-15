'use client';
import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '../components/shared/TopBar';
import Button from '../components/shared/Button';
import CameraPill from '../components/camera/CameraPill';
import useScanner from '../components/scanner/useScanner';
export default function Splash(){const router=useRouter(),[eye,setEye]=useState(true),[help,setHelp]=useState(false);const {select}=useScanner([{label:'Begin with eye control'}],()=>router.push('/setup'));const blink=useRef(select);blink.current=select;const onBlink=useCallback(()=>blink.current(),[]);return <main className="app"><TopBar eyeOn={eye} toggleEye={()=>setEye(x=>!x)} onHelp={()=>setHelp(true)}/><div className="screen-center"><div><h1 className="splash-word">Aloud<span className="dot">.</span></h1><p className="tagline">A voice for anyone who can speak<br/>only with their eyes.</p><Button className="primary" onSelect={()=>select(0)}>Begin with eye control</Button></div></div>{help&&<div className="help"><div className="help-card"><h2>Speaking with your eyes</h2><p>The highlight moves through choices. Hold a long blink to choose, or click any choice. Spacebar works as a testing fallback.</p><Button className="dark" onSelect={()=>setHelp(false)}>Got it</Button></div></div>}<CameraPill enabled={eye} onLongBlink={onBlink}/></main>}
