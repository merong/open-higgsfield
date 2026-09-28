import type { HelpGuide } from "./guides";
import { IconDrawing } from "./help-icons";
export function Workflow({guide}:{guide:HelpGuide}){
  const description=guide.steps.map((s,i)=>`${i+1}. ${s.title}`).join(" → ");
  return <figure className="help-workflow">
    <svg className="help-flow-wide" viewBox="0 0 960 208" role="img" aria-labelledby={`${guide.slug}-flow-title ${guide.slug}-flow-desc`}>
      <title id={`${guide.slug}-flow-title`}>{guide.title} 워크플로우</title><desc id={`${guide.slug}-flow-desc`}>{description}</desc>
      {guide.steps.map((s,i)=><g key={s.short} transform={`translate(${i*246} 0)`}>
        <rect className="help-flow-card" x="1" y="1" width="220" height="204" rx="16"/>
        <text className="help-flow-number" x="20" y="30">0{i+1}</text>
        <g transform="translate(82 50) scale(2.4)" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="help-flow-icon"><IconDrawing name={s.icon}/></g>
        <text className="help-flow-label" x="111" y="160" textAnchor="middle">{s.short}</text>
        <path className="help-flow-line" d="M88 180h46"/>
        {i<guide.steps.length-1 && <path className="help-flow-arrow" d="M224 103h17m-6-5 6 5-6 5" fill="none"/>}
      </g>)}
    </svg>
    <svg className="help-flow-narrow" viewBox="0 0 350 400" role="img" aria-label={`${guide.title} 워크플로우: ${description}`}>
      {guide.steps.map((s,i)=><g key={s.short} transform={`translate(0 ${i*104})`}>
        <rect className="help-flow-card" x="1" y="1" width="348" height="82" rx="12"/>
        <g transform="translate(20 18) scale(1.9)" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="help-flow-icon"><IconDrawing name={s.icon}/></g>
        <text className="help-flow-number" x="86" y="30">STEP 0{i+1}</text><text className="help-flow-label" x="86" y="58">{s.short}</text>
        {i<guide.steps.length-1 && <path className="help-flow-arrow" d="M175 87v13m-5-5 5 5 5-5" fill="none"/>}
      </g>)}
    </svg><figcaption>순서대로 따라가면 완성할 수 있어요. 아래에서 각 단계를 자세히 확인하세요.</figcaption>
  </figure>;
}
