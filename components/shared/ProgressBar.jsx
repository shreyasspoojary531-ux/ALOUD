export default function ProgressBar({ value }) { return <div className="progress" aria-label={`${value}% complete`}><span style={{width:`${value}%`}} /></div>; }
