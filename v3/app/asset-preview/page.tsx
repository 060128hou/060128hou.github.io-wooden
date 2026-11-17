'use client';
import {useState,useEffect,useRef} from 'react';
import {Scene,SceneHandle} from '@/components/Scene';
export default function AssetPreview(){const [id,setId]=useState(''),ref=useRef<SceneHandle>(null);useEffect(()=>{setId(new URLSearchParams(location.search).get('asset')||'timber-hall');(window as any).__assetCapture=()=>ref.current?.capture();},[]);return <div style={{width:'100vw',height:'100vh',background:'#24251f'}}>{id&&<Scene ref={ref} url={id.startsWith('pattern-')?'/assets/patterns/'+id+'.glb.gz':'/assets/architecture/'+id+'.glb.gz'} patternView={id.startsWith('pattern-')}/>}</div>;}
