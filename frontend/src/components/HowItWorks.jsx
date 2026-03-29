import './HowItWorks.css'

const steps = [
  { num: "01", title: "Sign in with Google", desc: "Authenticate securely with your Google account. A JWT token is issued for all subsequent API calls." },
  { num: "02", title: "Search 999K+ papers", desc: "Full-text search powered by a GIN index across titles and abstracts. Results cached in Redis." },
  { num: "03", title: "Write with AI assist", desc: "Start a draft. PaperLens suggests next sentences using the Claude API, cached for speed." },
  { num: "04", title: "Download as Word doc", desc: "Export any draft or version as a .docx file. Full version history preserved in the database." },
]

export default function HowItWorks() {
  return (
    <section className="how">
      <div className="how-container">
        <div className="section-label">How it works</div>
        <h2 className="section-title">From search to submission</h2>
        <div className="how-steps">
          {steps.map((step, i) => (
            <div key={i} className="how-step">
              <div className="step-num">{step.num}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}