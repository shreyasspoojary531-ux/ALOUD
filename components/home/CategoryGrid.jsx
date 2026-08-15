'use client';
import useScanner from '../scanner/useScanner';
import CategoryCard from './CategoryCard';
export default function CategoryGrid({ items, onChoose, sub = false, blinkSelect }) { const {active,select}=useScanner(items,onChoose); blinkSelect.current=select; return <div className={sub?'grid subgrid':'grid'}>{items.map((item,i)=><CategoryCard key={item.label} item={item} active={i===active} onSelect={()=>select(i)}/>)}</div>; }
